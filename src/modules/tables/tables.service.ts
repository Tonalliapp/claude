import { TableStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { generateTableQR, getTableMenuURL, generateCustomQR, generateBrandedQR } from '../../utils/generateQR';
import { getIO } from '../../websocket/socket';
import { tenantRoom } from '../../websocket/rooms';
import { getLogoBuffer } from '../tenants/tenants.service';
import type { CreateTableInput, UpdateTableInput, CustomQRInput, BrandedQRInput } from './tables.schema';
import type { CustomQROptions } from '../../utils/generateQR';

export async function list(tenantId: string) {
  return prisma.table.findMany({
    where: { tenantId },
    orderBy: { number: 'asc' },
  });
}

export async function create(tenantId: string, data: CreateTableInput) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new AppError(404, 'Tenant not found', 'NOT_FOUND');

  const count = await prisma.table.count({ where: { tenantId } });
  if (count >= tenant.maxTables) {
    throw new AppError(403, `Límite de mesas alcanzado (${tenant.maxTables})`, 'PLAN_LIMIT');
  }

  const existing = await prisma.table.findUnique({
    where: { tenantId_number: { tenantId, number: data.number } },
  });
  if (existing) throw new AppError(409, `La mesa ${data.number} ya existe`, 'TABLE_EXISTS');

  const qrCode = getTableMenuURL(tenant.slug, data.number);

  return prisma.table.create({
    data: {
      tenantId,
      number: data.number,
      capacity: data.capacity ?? 4,
      qrCode,
    },
  });
}

export async function update(tenantId: string, id: string, data: UpdateTableInput) {
  const table = await prisma.table.findFirst({ where: { id, tenantId } });
  if (!table) throw new AppError(404, 'Mesa no encontrada', 'NOT_FOUND');

  if (data.number && data.number !== table.number) {
    const existing = await prisma.table.findUnique({
      where: { tenantId_number: { tenantId, number: data.number } },
    });
    if (existing) throw new AppError(409, `La mesa ${data.number} ya existe`, 'TABLE_EXISTS');
  }

  return prisma.table.update({ where: { id }, data });
}

export async function remove(tenantId: string, id: string) {
  const table = await prisma.table.findFirst({ where: { id, tenantId } });
  if (!table) throw new AppError(404, 'Mesa no encontrada', 'NOT_FOUND');

  return prisma.table.delete({ where: { id } });
}

export async function getQR(tenantId: string, id: string) {
  const table = await prisma.table.findFirst({
    where: { id, tenantId },
    include: { tenant: { select: { slug: true } } },
  });
  if (!table) throw new AppError(404, 'Mesa no encontrada', 'NOT_FOUND');

  const qrDataUrl = await generateTableQR(table.tenant.slug, table.number);
  return { tableNumber: table.number, qrCode: qrDataUrl, menuUrl: table.qrCode };
}

export async function getCustomQR(tenantId: string, tableId: string, options: CustomQRInput): Promise<Buffer> {
  const table = await prisma.table.findFirst({
    where: { id: tableId, tenantId },
    include: { tenant: { select: { slug: true, logoUrl: true } } },
  });
  if (!table) throw new AppError(404, 'Mesa no encontrada', 'NOT_FOUND');

  const logoBuffer = await getLogoBuffer(tenantId);
  if (!logoBuffer) {
    throw new AppError(400, 'Primero sube el logo de tu restaurante en /api/v1/tenants/me/logo', 'LOGO_REQUIRED');
  }

  const qrOptions: Partial<CustomQROptions> = {
    qrSize: options.qrSize,
    position: options.position,
    opacity: options.opacity,
    canvasSize: options.canvasSize,
    showTableNumber: options.showTableNumber,
  };

  if (options.customX !== undefined && options.customY !== undefined) {
    qrOptions.customX = options.customX;
    qrOptions.customY = options.customY;
  }

  return generateCustomQR(table.tenant.slug, table.number, logoBuffer, qrOptions);
}

export async function getBrandedQR(tenantId: string, tableId: string, options: BrandedQRInput): Promise<Buffer> {
  const table = await prisma.table.findFirst({
    where: { id: tableId, tenantId },
    include: { tenant: { select: { slug: true, logoUrl: true } } },
  });
  if (!table) throw new AppError(404, 'Mesa no encontrada', 'NOT_FOUND');

  const logoBuffer = await getLogoBuffer(tenantId);
  if (!logoBuffer) {
    throw new AppError(400, 'Primero sube el logo de tu restaurante en /api/v1/tenants/me/logo', 'LOGO_REQUIRED');
  }

  return generateBrandedQR(table.tenant.slug, table.number, logoBuffer, {
    layout: options.layout,
    showTableNumber: options.showTableNumber,
  });
}

export async function updateStatus(tenantId: string, id: string, status: TableStatus) {
  const table = await prisma.table.findFirst({ where: { id, tenantId } });
  if (!table) throw new AppError(404, 'Mesa no encontrada', 'NOT_FOUND');

  const updated = await prisma.table.update({ where: { id }, data: { status } });

  // Emit WebSocket event
  getIO().of('/staff').to(tenantRoom(tenantId)).emit('table:updated', updated);

  return updated;
}
