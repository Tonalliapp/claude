import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import type { ListQueryInput } from './admin.schema';

interface CreateAuditLogInput {
  userId: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export async function createAuditLog(input: CreateAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      details: (input.details ?? {}) as Prisma.InputJsonValue,
      ipAddress: input.ipAddress,
    },
  });
}

export async function listAuditLogs(query: ListQueryInput) {
  const { page, limit, search, from, to } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {};

  if (search) {
    where.action = { contains: search, mode: 'insensitive' };
  }

  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
