import { Decimal } from '@prisma/client/runtime/library';
import { OrderStatus, OrderItemStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { getIO } from '../../websocket/socket';
import { tenantRoom, kitchenRoom, tableRoom } from '../../websocket/rooms';
import { generateOrderNumber } from '../../utils/generateOrderNumber';
import { deductInventory } from '../../utils/inventoryDeduction';
import type { CreateOrderInput, CreatePosOrderInput, ListQuery } from './orders.schema';

const orderInclude = {
  items: {
    include: { product: { select: { id: true, name: true, imageUrl: true, category: { select: { id: true, name: true } } } } },
  },
  table: { select: { id: true, number: true } },
  user: { select: { id: true, name: true, role: true } },
} as const;

export async function list(tenantId: string, query: ListQuery) {
  const where: Record<string, unknown> = { tenantId };
  if (query.status) where.status = query.status;
  if (query.tableId) where.tableId = query.tableId;
  if (query.source) where.source = query.source;
  if (query.orderType) where.orderType = query.orderType;
  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total, page: query.page, limit: query.limit };
}

export async function getById(tenantId: string, id: string) {
  const order = await prisma.order.findFirst({
    where: { id, tenantId },
    include: orderInclude,
  });
  if (!order) throw new AppError(404, 'Pedido no encontrado', 'NOT_FOUND');
  return order;
}

export async function create(tenantId: string, data: CreateOrderInput, userId?: string) {
  // Verify table belongs to tenant (only if tableId provided)
  if (data.tableId) {
    const table = await prisma.table.findFirst({ where: { id: data.tableId, tenantId } });
    if (!table) throw new AppError(404, 'Mesa no encontrada', 'TABLE_NOT_FOUND');
  }

  // Fetch products and validate
  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, tenantId, available: true },
  });

  if (products.length !== productIds.length) {
    throw new AppError(400, 'Uno o más productos no están disponibles', 'PRODUCT_UNAVAILABLE');
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Calculate totals
  const items = data.items.map((item) => {
    const product = productMap.get(item.productId)!;
    const unitPrice = product.price;
    const subtotal = new Decimal(unitPrice.toString()).mul(item.quantity);
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice,
      subtotal,
      notes: item.notes,
    };
  });

  const total = items.reduce((sum, i) => sum.add(i.subtotal), new Decimal(0));
  const orderNumber = await generateOrderNumber(tenantId);

  const order = await prisma.order.create({
    data: {
      tenantId,
      tableId: data.tableId,
      userId,
      orderNumber,
      orderType: (data as { orderType?: string }).orderType ?? 'dine_in',
      subtotal: total,
      total,
      notes: data.notes,
      customerName: (data as { customerName?: string }).customerName,
      items: { create: items },
    } as any,
    include: orderInclude,
  });

  // Update table status (only if table exists)
  if (data.tableId) {
    await prisma.table.update({
      where: { id: data.tableId },
      data: { status: 'occupied' },
    });
  }

  // Auto-deduct inventory
  await deductInventory(tenantId, data.items, order.orderNumber);

  // Emit WebSocket events
  const io = getIO();
  io.of('/staff').to(tenantRoom(tenantId)).emit('order:new', order);
  io.of('/staff').to(kitchenRoom(tenantId)).emit('order:new', order);
  if (data.tableId) {
    io.of('/client').to(tableRoom(tenantId, data.tableId)).emit('order:updated', order);
  }

  return order;
}

export async function createPosOrder(tenantId: string, data: CreatePosOrderInput, userId: string) {
  // Fetch products and validate
  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, tenantId, available: true },
  });

  if (products.length !== productIds.length) {
    throw new AppError(400, 'Uno o más productos no están disponibles', 'PRODUCT_UNAVAILABLE');
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  const items = data.items.map((item) => {
    const product = productMap.get(item.productId)!;
    const unitPrice = product.price;
    const subtotal = new Decimal(unitPrice.toString()).mul(item.quantity);
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice,
      subtotal,
      notes: item.notes,
    };
  });

  const total = items.reduce((sum, i) => sum.add(i.subtotal), new Decimal(0));
  const orderNumber = await generateOrderNumber(tenantId);

  // Atomic transaction: create order + payment + update cash register
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        tenantId,
        userId,
        orderNumber,
        orderType: data.orderType,
        status: data.payImmediately ? 'paid' : 'pending',
        subtotal: total,
        total,
        notes: data.notes,
        customerName: data.customerName,
        paidAt: data.payImmediately ? new Date() : undefined,
        items: { create: items },
      } as any,
      include: orderInclude,
    });

    if (data.payImmediately) {
      // Get open cash register
      const cashRegister = await tx.cashRegister.findFirst({
        where: { tenantId, status: 'open' },
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          cashRegisterId: cashRegister?.id,
          method: data.paymentMethod,
          amount: total,
          reference: data.paymentReference,
        },
      });

      if (cashRegister) {
        await tx.cashRegister.update({
          where: { id: cashRegister.id },
          data: {
            salesTotal: { increment: total },
            transactions: { increment: 1 },
          },
        });
      }
    }

    return order;
  });

  // Auto-deduct inventory
  await deductInventory(tenantId, data.items, result.orderNumber);

  // Emit WebSocket events
  const io = getIO();
  io.of('/staff').to(tenantRoom(tenantId)).emit('order:new', result);

  return result;
}

// Valid status transitions
const statusTransitions: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered'],
  delivered: ['paid'],
};

export async function updateStatus(tenantId: string, id: string, status: OrderStatus) {
  const order = await prisma.order.findFirst({ where: { id, tenantId } });
  if (!order) throw new AppError(404, 'Pedido no encontrado', 'NOT_FOUND');

  const allowed = statusTransitions[order.status] ?? [];
  if (!allowed.includes(status)) {
    throw new AppError(
      400,
      `No se puede cambiar de "${order.status}" a "${status}"`,
      'INVALID_TRANSITION',
    );
  }

  const timestamps: Record<string, unknown> = {};
  if (status === 'confirmed') timestamps.confirmedAt = new Date();
  if (status === 'delivered') timestamps.completedAt = new Date();
  if (status === 'paid') timestamps.paidAt = new Date();

  const updated = await prisma.order.update({
    where: { id },
    data: { status, ...timestamps },
    include: orderInclude,
  });

  // If paid or cancelled, free the table (if no other active orders)
  if ((status === 'paid' || status === 'cancelled') && order.tableId) {
    const activeOrders = await prisma.order.count({
      where: {
        tenantId,
        tableId: order.tableId,
        status: { notIn: ['paid', 'cancelled'] },
      },
    });
    if (activeOrders === 0) {
      await prisma.table.update({
        where: { id: order.tableId },
        data: { status: 'free' },
      });
    }
  }

  // Emit WebSocket
  const io = getIO();
  io.of('/staff').to(tenantRoom(tenantId)).emit('order:updated', updated);
  if (order.tableId) {
    io.of('/client').to(tableRoom(tenantId, order.tableId)).emit('order:updated', updated);
  }

  return updated;
}

export async function cancelOrder(tenantId: string, id: string, reason: string) {
  const order = await prisma.order.findFirst({ where: { id, tenantId } });
  if (!order) throw new AppError(404, 'Pedido no encontrado', 'NOT_FOUND');

  if (['paid', 'cancelled'].includes(order.status)) {
    throw new AppError(400, 'No se puede cancelar este pedido', 'INVALID_TRANSITION');
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: 'cancelled', cancelReason: reason },
    include: orderInclude,
  });

  const io = getIO();
  io.of('/staff').to(tenantRoom(tenantId)).emit('order:updated', updated);
  if (order.tableId) {
    io.of('/client').to(tableRoom(tenantId, order.tableId)).emit('order:updated', updated);
  }

  return updated;
}

export async function updateItemStatus(
  tenantId: string,
  orderId: string,
  itemId: string,
  status: OrderItemStatus,
) {
  const order = await prisma.order.findFirst({ where: { id: orderId, tenantId } });
  if (!order) throw new AppError(404, 'Pedido no encontrado', 'NOT_FOUND');

  const item = await prisma.orderItem.findFirst({ where: { id: itemId, orderId } });
  if (!item) throw new AppError(404, 'Item no encontrado', 'NOT_FOUND');

  const updated = await prisma.orderItem.update({
    where: { id: itemId },
    data: { status },
    include: { product: { select: { id: true, name: true } } },
  });

  const io = getIO();
  io.of('/staff').to(tenantRoom(tenantId)).emit('order:item:updated', { orderId, item: updated });
  if (order.tableId) {
    io.of('/client').to(tableRoom(tenantId, order.tableId)).emit('order:item:updated', { orderId, item: updated });
  }

  // Auto-ready: if all items are ready/delivered, move order to ready
  if (status === 'ready' || status === 'delivered') {
    const allItems = await prisma.orderItem.findMany({ where: { orderId } });
    const allDone = allItems.every((i) => i.status === 'ready' || i.status === 'delivered');
    if (allDone && order.status === 'preparing') {
      const readyOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'ready' },
        include: orderInclude,
      });
      io.of('/staff').to(tenantRoom(tenantId)).emit('order:updated', readyOrder);
      if (order.tableId) {
        io.of('/client').to(tableRoom(tenantId, order.tableId)).emit('order:updated', readyOrder);
      }
    }
  }

  return updated;
}
