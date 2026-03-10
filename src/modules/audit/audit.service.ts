import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

interface AuditEntry {
  tenantId: string;
  userId: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Fire-and-forget audit log. Never throws — failures are silently logged.
 */
export function logAudit(entry: AuditEntry): void {
  prisma.auditLog
    .create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        details: (entry.details ?? {}) as Prisma.InputJsonValue,
        ipAddress: entry.ipAddress ?? null,
      },
    })
    .catch((err) => console.error('[Audit] Failed to log:', err.message));
}

export async function listAuditLogs(
  tenantId: string,
  query: { page?: number; limit?: number; action?: string; targetType?: string },
) {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 50, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { tenantId };
  if (query.action) where.action = query.action;
  if (query.targetType) where.targetType = query.targetType;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        details: true,
        ipAddress: true,
        createdAt: true,
        user: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, totalPages: Math.ceil(total / limit) };
}
