import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { getIO } from '../../websocket/socket';
import { tenantRoom, tableRoom } from '../../websocket/rooms';
import * as ordersService from '../orders/orders.service';
import type { CreateClientOrderInput, RequestBillInput, CallWaiterInput } from './clientOrders.schema';

async function resolveTenantAndTable(slug: string, tableNumber: number) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, status: true },
  });

  if (!tenant || tenant.status !== 'active') {
    throw new AppError(404, 'Restaurante no encontrado o inactivo', 'TENANT_NOT_FOUND');
  }

  const table = await prisma.table.findUnique({
    where: { tenantId_number: { tenantId: tenant.id, number: tableNumber } },
  });

  if (!table || !table.active) {
    throw new AppError(404, 'Mesa no encontrada', 'TABLE_NOT_FOUND');
  }

  return { tenant, table };
}

export async function createClientOrder(data: CreateClientOrderInput) {
  const { tenant, table } = await resolveTenantAndTable(data.slug, data.tableNumber);

  if (table.status === 'reserved') {
    throw new AppError(403, 'Esta mesa está reservada', 'TABLE_RESERVED');
  }

  return ordersService.create(
    tenant.id,
    { tableId: table.id, orderType: 'dine_in', items: data.items, notes: data.notes },
    undefined, // no userId for client orders
  );
}

export async function getClientOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, imageUrl: true } } },
      },
      table: { select: { number: true } },
    },
  });

  if (!order) throw new AppError(404, 'Pedido no encontrado', 'NOT_FOUND');

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    items: order.items,
    subtotal: order.subtotal,
    total: order.total,
    notes: order.notes,
    tableNumber: order.table?.number ?? null,
    createdAt: order.createdAt,
    confirmedAt: order.confirmedAt,
    completedAt: order.completedAt,
  };
}

export async function requestBill(data: RequestBillInput) {
  const { tenant, table } = await resolveTenantAndTable(data.slug, data.tableNumber);

  // Find active orders for this table
  const activeOrders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      tableId: table.id,
      status: { notIn: ['paid', 'cancelled'] },
    },
    select: { id: true, orderNumber: true, total: true },
  });

  if (activeOrders.length === 0) {
    throw new AppError(400, 'No hay pedidos activos en esta mesa', 'NO_ACTIVE_ORDERS');
  }

  // Update table status to "bill"
  await prisma.table.update({
    where: { id: table.id },
    data: { status: 'bill' },
  });

  // Emit to staff
  const io = getIO();
  const payload = {
    type: 'bill_requested',
    tableNumber: table.number,
    tableId: table.id,
    orders: activeOrders,
    timestamp: new Date().toISOString(),
  };

  io.of('/staff').to(tenantRoom(tenant.id)).emit('table:bill-requested', payload);

  return { message: 'Cuenta solicitada. Un mesero se acercará a tu mesa.', tableNumber: table.number };
}

export async function callWaiter(data: CallWaiterInput) {
  const { tenant, table } = await resolveTenantAndTable(data.slug, data.tableNumber);

  const io = getIO();
  const payload = {
    type: 'waiter_called',
    tableNumber: table.number,
    tableId: table.id,
    reason: data.reason || 'Asistencia solicitada',
    timestamp: new Date().toISOString(),
  };

  io.of('/staff').to(tenantRoom(tenant.id)).emit('table:waiter-called', payload);

  return { message: 'Un mesero se acercará a tu mesa.', tableNumber: table.number };
}
