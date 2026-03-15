import { TableStatus } from '@prisma/client';
import archiver from 'archiver';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { generateTableQR, getTableMenuURL, generateBrandedQR, wrapInPdf } from '../../utils/generateQR';
import type { BrandedQROptions } from '../../utils/generateQR';
import { getLogoBuffer } from '../tenants/tenants.service';
import { getIO } from '../../websocket/socket';
import { tenantRoom } from '../../websocket/rooms';
import type { CreateTableInput, UpdateTableInput, BrandedQRInput, BatchQRInput } from './tables.schema';

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

export async function updateStatus(tenantId: string, id: string, status: TableStatus) {
  const table = await prisma.table.findFirst({ where: { id, tenantId } });
  if (!table) throw new AppError(404, 'Mesa no encontrada', 'NOT_FOUND');

  const updated = await prisma.table.update({ where: { id }, data: { status } });

  getIO().of('/staff').to(tenantRoom(tenantId)).emit('table:updated', updated);

  return updated;
}

export async function getBrandedQR(tenantId: string, tableId: string, options: BrandedQRInput) {
  const table = await prisma.table.findFirst({
    where: { id: tableId, tenantId },
    include: { tenant: { select: { slug: true, name: true } } },
  });
  if (!table) throw new AppError(404, 'Mesa no encontrada', 'NOT_FOUND');

  const logoBuffer = await getLogoBuffer(tenantId);

  const qrOptions: BrandedQROptions = {
    template: options.template,
    font: options.font,
    title: options.title || table.tenant.name,
    subtitle: options.subtitle,
    callToAction: options.callToAction || 'Escanea para ver el menú',
    showTableNumber: options.showTableNumber,
    logoSize: options.logoSize,
    logoPosition: options.logoPosition,
    logoShape: options.logoShape,
    qrSize: options.qrSize,
    qrStyle: options.qrStyle,
    showDecorations: options.showDecorations,
    bgColor: options.bgColor,
    accentColor: options.accentColor,
    textColor: options.textColor,
  };

  const pngBuffer = await generateBrandedQR(table.tenant.slug, table.number, logoBuffer, qrOptions);

  if (options.format === 'pdf') {
    const pdfBuffer = await wrapInPdf(pngBuffer, 1200, 1800);
    return { buffer: pdfBuffer, contentType: 'application/pdf', filename: `mesa-${table.number}-qr.pdf` };
  }

  return { buffer: pngBuffer, contentType: 'image/png', filename: `mesa-${table.number}-qr.png` };
}

export async function getBatchQR(tenantId: string, options: BatchQRInput) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true, name: true },
  });
  if (!tenant) throw new AppError(404, 'Tenant not found', 'NOT_FOUND');

  const tables = await prisma.table.findMany({
    where: { tenantId, active: true },
    orderBy: { number: 'asc' },
  });

  if (tables.length === 0) {
    throw new AppError(400, 'No hay mesas activas', 'NO_TABLES');
  }

  const logoBuffer = await getLogoBuffer(tenantId);

  const qrOptions: BrandedQROptions = {
    template: options.template,
    font: options.font,
    title: options.title || tenant.name,
    subtitle: options.subtitle,
    callToAction: options.callToAction || 'Escanea para ver el menú',
    showTableNumber: options.showTableNumber,
    logoSize: options.logoSize,
    logoPosition: options.logoPosition,
    logoShape: options.logoShape,
    qrSize: options.qrSize,
    qrStyle: options.qrStyle,
    showDecorations: options.showDecorations,
    bgColor: options.bgColor,
    accentColor: options.accentColor,
    textColor: options.textColor,
  };

  // Generate all QR images
  const images: { name: string; buffer: Buffer }[] = [];
  for (const table of tables) {
    const pngBuffer = await generateBrandedQR(tenant.slug, table.number, logoBuffer, qrOptions);
    images.push({ name: `mesa-${table.number}.png`, buffer: pngBuffer });
  }

  // Package into ZIP
  return new Promise<Buffer>((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 6 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    for (const img of images) {
      archive.append(img.buffer, { name: img.name });
    }

    archive.finalize();
  });
}
