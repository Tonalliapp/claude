import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { processImage } from '../../utils/imageProcessor';
import { uploadToStorage } from '../../utils/uploadFile';
import type { Prisma } from '@prisma/client';
import type { UpdateTenantInput } from './tenants.schema';

export async function getMyTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new AppError(404, 'Tenant not found', 'NOT_FOUND');
  return tenant;
}

export async function updateMyTenant(tenantId: string, data: UpdateTenantInput) {
  const updateData: Prisma.TenantUpdateInput = {};
  if (data.name) updateData.name = data.name;
  if (data.config) updateData.config = data.config as Prisma.InputJsonValue;

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: updateData,
  });
  return tenant;
}

export async function uploadLogo(tenantId: string, imageBuffer: Buffer) {
  const processed = await processImage(imageBuffer, { width: 1024, height: 1024, quality: 90 });
  const logoUrl = await uploadToStorage(processed.buffer, 'logos', processed.mimetype, processed.extension);

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { logoUrl },
  });

  return tenant;
}

export async function getLogoBuffer(tenantId: string): Promise<Buffer | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { logoUrl: true },
  });

  if (!tenant?.logoUrl) return null;

  // Fetch logo from MinIO via URL
  try {
    const response = await fetch(tenant.logoUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}
