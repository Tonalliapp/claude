import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { authConfig } from '../../config/auth';
import { AppError } from '../../middleware/errorHandler';
import type { CreateUserInput, UpdateUserInput } from './users.schema';

const userSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  role: true,
  active: true,
  lastLogin: true,
  createdAt: true,
};

export async function list(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId },
    select: userSelect,
    orderBy: { createdAt: 'asc' },
  });
}

export async function create(tenantId: string, data: CreateUserInput) {
  // Check plan limits
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new AppError(404, 'Tenant not found', 'NOT_FOUND');

  const count = await prisma.user.count({ where: { tenantId } });
  if (count >= tenant.maxUsers) {
    throw new AppError(403, `Límite de usuarios alcanzado (${tenant.maxUsers})`, 'PLAN_LIMIT');
  }

  // Reserve "admin" username
  if (data.username.toLowerCase() === 'admin') {
    throw new AppError(409, 'El username "admin" está reservado', 'USERNAME_RESERVED');
  }

  // Check unique username within tenant
  const exists = await prisma.user.findUnique({
    where: { tenantId_username: { tenantId, username: data.username } },
  });
  if (exists) {
    throw new AppError(409, 'El username ya está registrado', 'USERNAME_EXISTS');
  }

  const passwordHash = await bcrypt.hash(data.password, authConfig.bcryptRounds);

  return prisma.user.create({
    data: {
      tenantId,
      name: data.name,
      username: data.username,
      passwordHash,
      role: data.role,
    },
    select: userSelect,
  });
}

export async function update(tenantId: string, userId: string, data: UpdateUserInput) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

  // Prevent modifying owners
  if (user.role === 'owner') {
    throw new AppError(403, 'No puedes modificar al dueño', 'FORBIDDEN');
  }

  const updateData: Record<string, unknown> = {};
  if (data.name) updateData.name = data.name;
  if (data.username) {
    if (data.username.toLowerCase() === 'admin') {
      throw new AppError(409, 'El username "admin" está reservado', 'USERNAME_RESERVED');
    }
    const exists = await prisma.user.findUnique({
      where: { tenantId_username: { tenantId, username: data.username } },
    });
    if (exists && exists.id !== userId) {
      throw new AppError(409, 'El username ya está registrado', 'USERNAME_EXISTS');
    }
    updateData.username = data.username;
  }
  if (data.role) updateData.role = data.role;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, authConfig.bcryptRounds);
  }

  return prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: userSelect,
  });
}

export async function deactivate(tenantId: string, userId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
  if (user.role === 'owner') {
    throw new AppError(403, 'No puedes desactivar al dueño', 'FORBIDDEN');
  }

  return prisma.user.update({
    where: { id: userId },
    data: { active: false },
    select: userSelect,
  });
}
