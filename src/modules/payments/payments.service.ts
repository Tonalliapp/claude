import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { getIO } from '../../websocket/socket';
import { tenantRoom } from '../../websocket/rooms';
import type { CreatePaymentInput, ListPaymentsQuery } from './payments.schema';

export async function create(tenantId: string, data: CreatePaymentInput) {
  // Verify order belongs to tenant
  const order = await prisma.order.findFirst({ where: { id: data.orderId, tenantId } });
  if (!order) throw new AppError(404, 'Pedido no encontrado', 'NOT_FOUND');

  if (order.status === 'paid') {
    throw new AppError(400, 'El pedido ya fue pagado', 'ALREADY_PAID');
  }
  if (order.status === 'cancelled') {
    throw new AppError(400, 'No se puede pagar un pedido cancelado', 'ORDER_CANCELLED');
  }

  // Get open cash register
  const cashRegister = await prisma.cashRegister.findFirst({
    where: { tenantId, status: 'open' },
  });

  const payment = await prisma.payment.create({
    data: {
      orderId: data.orderId,
      cashRegisterId: cashRegister?.id,
      method: data.method,
      amount: data.amount,
      reference: data.reference,
    },
    include: { order: { select: { id: true, orderNumber: true, tableId: true } } },
  });

  // Update order to paid
  await prisma.order.update({
    where: { id: data.orderId },
    data: { status: 'paid', paidAt: new Date() },
  });

  // Update cash register totals
  if (cashRegister) {
    await prisma.cashRegister.update({
      where: { id: cashRegister.id },
      data: {
        salesTotal: { increment: data.amount },
        transactions: { increment: 1 },
      },
    });
  }

  // Emit WebSocket
  const io = getIO();
  io.of('/staff').to(tenantRoom(tenantId)).emit('payment:created', payment);
  io.of('/staff').to(tenantRoom(tenantId)).emit('order:updated', { id: data.orderId, status: 'paid' });

  // Free table if no other active orders (only if order has a table)
  if (order.tableId) {
    const activeOrders = await prisma.order.count({
      where: {
        tenantId,
        tableId: order.tableId,
        status: { notIn: ['paid', 'cancelled'] },
      },
    });
    if (activeOrders === 0) {
      const freedTable = await prisma.table.update({
        where: { id: order.tableId },
        data: { status: 'free' },
      });
      io.of('/staff').to(tenantRoom(tenantId)).emit('table:updated', freedTable);
    }
  }

  return payment;
}

export async function list(tenantId: string, query: ListPaymentsQuery) {
  const where: Record<string, unknown> = {
    order: { tenantId },
  };

  if (query.method) where.method = query.method;
  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { order: { select: { id: true, orderNumber: true, tableId: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return { payments, total, page: query.page, limit: query.limit };
}
