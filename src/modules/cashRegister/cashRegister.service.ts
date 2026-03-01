import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import type { OpenCashRegisterInput, CloseCashRegisterInput } from './cashRegister.schema';

export async function getCurrent(tenantId: string) {
  const register = await prisma.cashRegister.findFirst({
    where: { tenantId, status: 'open' },
    include: {
      user: { select: { id: true, name: true } },
      payments: { include: { order: { select: { id: true, orderNumber: true } } } },
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

  return prisma.cashRegister.update({
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
      payments: { include: { order: { select: { id: true, orderNumber: true } } } },
    },
  });
}
