import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import type { OpenCashRegisterInput, CloseCashRegisterInput, HistoryQuery } from './cashRegister.schema';

function buildBreakdown(payments: { method: string; amount: unknown; order: { source: string } | null }[]) {
  const breakdown: Record<string, { count: number; total: number }> = {
    cash: { count: 0, total: 0 },
    card: { count: 0, total: 0 },
    transfer: { count: 0, total: 0 },
  };
  const bySource: Record<string, { count: number; total: number }> = {};
  let totalSales = 0;

  for (const p of payments) {
    const amt = Number(p.amount);
    // By method
    if (breakdown[p.method]) {
      breakdown[p.method].count += 1;
      breakdown[p.method].total += amt;
    }
    // By source
    const src = p.order?.source ?? 'tonalli';
    if (!bySource[src]) bySource[src] = { count: 0, total: 0 };
    bySource[src].count += 1;
    bySource[src].total += amt;

    totalSales += amt;
  }

  return { breakdown, bySource, totalTransactions: payments.length, totalSales };
}

export async function getCurrent(tenantId: string) {
  const register = await prisma.cashRegister.findFirst({
    where: { tenantId, status: 'open' },
    include: {
      user: { select: { id: true, name: true } },
      payments: { include: { order: { select: { id: true, orderNumber: true, source: true } } } },
    },
  });

  return register;
}

export async function open(tenantId: string, userId: string, data: OpenCashRegisterInput) {
  // Check if there's already an open register
  const existing = await prisma.cashRegister.findFirst({
    where: { tenantId, status: 'open' },
  });

  if (existing) {
    throw new AppError(409, 'Ya hay una caja abierta', 'CASH_REGISTER_OPEN');
  }

  return prisma.cashRegister.create({
    data: {
      tenantId,
      userId,
      openingAmount: data.openingAmount,
      notes: data.notes,
    },
    include: { user: { select: { id: true, name: true } } },
  });
}

export async function close(tenantId: string, data: CloseCashRegisterInput) {
  const register = await prisma.cashRegister.findFirst({
    where: { tenantId, status: 'open' },
  });

  if (!register) {
    throw new AppError(404, 'No hay caja abierta', 'NO_OPEN_REGISTER');
  }

  const expectedAmount = new Decimal(register.openingAmount.toString())
    .add(register.salesTotal.toString());

  const updated = await prisma.cashRegister.update({
    where: { id: register.id },
    data: {
      status: 'closed',
      closedAt: new Date(),
      closingAmount: data.closingAmount,
      expectedAmount,
      notes: data.notes,
    },
    include: {
      user: { select: { id: true, name: true } },
      payments: { include: { order: { select: { id: true, orderNumber: true, source: true } } } },
    },
  });

  // Include breakdown in close response
  const { breakdown, bySource, totalTransactions, totalSales } = buildBreakdown(updated.payments);
  const difference = Number(updated.closingAmount ?? 0) - Number(updated.expectedAmount ?? 0);

  return {
    ...updated,
    breakdown,
    bySource,
    difference,
    totalTransactions,
    totalSales,
  };
}

export async function history(tenantId: string, query: HistoryQuery) {
  const [registers, total] = await Promise.all([
    prisma.cashRegister.findMany({
      where: { tenantId, status: 'closed' },
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { payments: true } },
      },
      orderBy: { closedAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.cashRegister.count({ where: { tenantId, status: 'closed' } }),
  ]);

  return { registers, total, page: query.page, limit: query.limit };
}

export async function summary(tenantId: string, registerId: string) {
  const register = await prisma.cashRegister.findFirst({
    where: { id: registerId, tenantId },
    include: {
      user: { select: { id: true, name: true } },
      payments: { include: { order: { select: { id: true, orderNumber: true, source: true } } } },
    },
  });

  if (!register) {
    throw new AppError(404, 'Turno no encontrado', 'NOT_FOUND');
  }

  const { breakdown, bySource, totalTransactions, totalSales } = buildBreakdown(register.payments);
  const difference = Number(register.closingAmount ?? 0) - Number(register.expectedAmount ?? 0);

  return {
    register,
    breakdown,
    bySource,
    difference,
    totalTransactions,
    totalSales,
  };
}
