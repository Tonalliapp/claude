import { Decimal } from '@prisma/client/runtime/library';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { getIO } from '../../websocket/socket';
import { tenantRoom, kitchenRoom } from '../../websocket/rooms';
import { generateOrderNumber } from '../../utils/generateOrderNumber';
import type { CreateDeliveryOrderInput, DeliveryWebhookInput } from './delivery.schema';

const orderInclude = {
  items: {
    include: { product: { select: { id: true, name: true, imageUrl: true, category: { select: { id: true, name: true } } } } },
  },
  table: { select: { id: true, number: true } },
  user: { select: { id: true, name: true, role: true } },
};

function formatOrderResponse(order: any) {
  return {
    tonalliOrderId: order.id,
    externalOrderId: order.externalOrderId,
    orderNumber: order.orderNumber,
    status: order.status,
    items: order.items.map((item: any) => ({
      id: item.id,
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
      notes: item.notes ?? null,
    })),
    subtotal: Number(order.subtotal),
    total: Number(order.total),
    deliveryMeta: order.deliveryMeta ?? {},
    createdAt: order.createdAt,
    confirmedAt: order.confirmedAt ?? null,
    completedAt: order.completedAt ?? null,
  };
}

export async function createDeliveryOrder(tenantId: string, data: CreateDeliveryOrderInput) {
  // Idempotency: check if order already exists
  const existing = await prisma.order.findFirst({
    where: { externalOrderId: data.externalOrderId },
    include: orderInclude,
  });

  if (existing) {
    return formatOrderResponse(existing);
  }

  // Fetch products and validate
  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, tenantId, available: true },
  });

  if (products.length !== productIds.length) {
    const found = new Set(products.map((p) => p.id));
    const missing = productIds.filter((id) => !found.has(id));
    throw new AppError(400, `Productos no disponibles: ${missing.join(', ')}`, 'PRODUCT_UNAVAILABLE');
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Calculate totals using Tonalli prices (source of truth)
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

  // Auto-confirm: delivery orders skip 'pending' and go straight to 'confirmed'
  // so they appear immediately on the KDS "Nuevas" column
  const order = await prisma.order.create({
    data: {
      tenantId,
      orderNumber,
      orderType: 'delivery',
      status: 'confirmed',
      confirmedAt: new Date(),
      subtotal: total,
      total,
      notes: data.notes,
      customerName: data.customerName,
      deliveryAddress: data.deliveryAddress,
      deliveryPhone: data.customerPhone,
      externalOrderId: data.externalOrderId,
      source: 'yesswera',
      deliveryMeta: {
        yessweraOrderId: data.externalOrderId,
      },
      items: { create: items },
    } as any,
    include: orderInclude,
  });

  // Emit WebSocket events — order appears on KDS instantly
  const io = getIO();
  io.of('/staff').to(tenantRoom(tenantId)).emit('order:new', order);
  io.of('/staff').to(kitchenRoom(tenantId)).emit('order:new', order);

  return formatOrderResponse(order);
}

export async function getOrderStatus(tenantId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId, source: 'yesswera' },
    include: orderInclude,
  });

  if (!order) {
    throw new AppError(404, 'Pedido no encontrado', 'ORDER_NOT_FOUND');
  }

  return formatOrderResponse(order);
}

export async function processWebhook(tenantId: string, data: DeliveryWebhookInput) {
  const order = await prisma.order.findFirst({
    where: { externalOrderId: data.externalOrderId, tenantId },
  });

  if (!order) {
    throw new AppError(404, 'Pedido no encontrado', 'ORDER_NOT_FOUND');
  }

  // Merge new data into deliveryMeta
  const currentMeta = (order.deliveryMeta ?? {}) as Record<string, Prisma.JsonValue>;
  const updatedMeta: Record<string, Prisma.JsonValue> = { ...currentMeta };

  // Store driver info
  if (data.data.driverName) updatedMeta.driverName = data.data.driverName;
  if (data.data.driverPhone) updatedMeta.driverPhone = data.data.driverPhone;
  if (data.data.driverVehicle) updatedMeta.driverVehicle = data.data.driverVehicle;
  if (data.data.estimatedMinutes !== undefined) updatedMeta.estimatedMinutes = data.data.estimatedMinutes;
  if (data.data.reason) updatedMeta.cancelReason = data.data.reason;

  // Track event timestamps
  updatedMeta[`${data.event}At`] = new Date().toISOString();

  // Determine status transition based on event
  let newStatus = order.status;
  const timestamps: Record<string, unknown> = {};

  switch (data.event) {
    case 'driver_assigned':
      updatedMeta.driverAssigned = true;
      break;
    case 'driver_verified':
      updatedMeta.verified = true;
      break;
    case 'picked_up':
      // Driver picked up food — in Tonalli terms, order left the kitchen
      if (order.status === 'ready') {
        newStatus = 'delivered';
        timestamps.completedAt = new Date();
      }
      break;
    case 'in_transit':
      updatedMeta.inTransit = true;
      break;
    case 'arrived':
      updatedMeta.arrived = true;
      break;
    case 'delivered':
      if (data.data.deliveredAt) updatedMeta.deliveredAt = data.data.deliveredAt;
      // If order is still 'ready' (picked_up webhook was missed), transition it
      if (order.status === 'ready') {
        newStatus = 'delivered';
        timestamps.completedAt = new Date();
      }
      break;
    case 'cancelled':
      if (!['paid', 'cancelled'].includes(order.status)) {
        newStatus = 'cancelled';
        if (data.data.reason) timestamps.cancelReason = data.data.reason;
      }
      break;
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: newStatus,
      deliveryMeta: updatedMeta,
      ...timestamps,
    },
    include: orderInclude,
  });

  // Emit WebSocket update
  const io = getIO();
  io.of('/staff').to(tenantRoom(tenantId)).emit('order:updated', updated);

  return {
    received: true,
    tonalliOrderId: updated.id,
    currentStatus: updated.status,
  };
}
