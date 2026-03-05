import crypto from 'crypto';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { processImage } from '../../utils/imageProcessor';
import { uploadToStorage } from '../../utils/uploadFile';
import type { Prisma } from '@prisma/client';
import type { UpdateTenantInput } from './tenants.schema';

const YESSWERA_REGISTER_URL =
  'https://jdvundwewwobkznxwkvj.supabase.co/functions/v1/register-tonalli-business';
const YESSWERA_WEBHOOK_URL =
  'https://jdvundwewwobkznxwkvj.supabase.co/functions/v1/tonalli-webhook';

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

export async function getYessweraStatus(tenantId: string) {
  const integration = await prisma.tenantIntegration.findFirst({
    where: { tenantId, platform: 'yesswera' },
    select: { active: true, createdAt: true },
  });

  if (!integration || !integration.active) {
    return { enabled: false };
  }

  return { enabled: true, connectedAt: integration.createdAt };
}

export async function toggleYesswera(tenantId: string, enabled: boolean) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true, logoUrl: true, config: true },
  });
  if (!tenant) throw new AppError(404, 'Tenant not found', 'NOT_FOUND');

  if (enabled) {
    // Create or reactivate integration
    const existing = await prisma.tenantIntegration.findFirst({
      where: { tenantId, platform: 'yesswera' },
    });

    let apiKey: string;

    if (existing) {
      if (existing.active) {
        return { enabled: true, connectedAt: existing.createdAt };
      }
      apiKey = existing.apiKey;
      await prisma.tenantIntegration.update({
        where: { id: existing.id },
        data: {
          active: true,
          config: { ...(existing.config as Record<string, unknown>), webhookUrl: YESSWERA_WEBHOOK_URL },
        },
      });
    } else {
      apiKey = crypto.randomBytes(32).toString('hex');
      await prisma.tenantIntegration.create({
        data: {
          tenantId,
          platform: 'yesswera',
          externalId: tenant.slug,
          apiKey,
          config: { webhookUrl: YESSWERA_WEBHOOK_URL },
          active: true,
        },
      });
    }

    // Notify Yesswera and get coverage response
    const cfg = (tenant.config ?? {}) as Record<string, string>;
    let coverage = null;
    try {
      const response = await notifyYessweraRegistration({
        slug: tenant.slug,
        name: tenant.name,
        logoUrl: tenant.logoUrl,
        address: cfg.address || null,
        phone: cfg.phone || null,
        apiKey,
        event: 'activated',
      });
      if (response) coverage = response;
    } catch { /* ignore */ }

    const integration = await prisma.tenantIntegration.findFirst({
      where: { tenantId, platform: 'yesswera' },
      select: { createdAt: true },
    });
    return { enabled: true, connectedAt: integration!.createdAt, coverage };
  } else {
    // Deactivate
    const existing = await prisma.tenantIntegration.findFirst({
      where: { tenantId, platform: 'yesswera', active: true },
    });

    if (!existing) {
      return { enabled: false };
    }

    await prisma.tenantIntegration.update({
      where: { id: existing.id },
      data: { active: false },
    });

    // Fire-and-forget: notify Yesswera
    notifyYessweraRegistration({
      slug: tenant.slug,
      name: tenant.name,
      logoUrl: tenant.logoUrl,
      address: null,
      phone: null,
      apiKey: existing.apiKey,
      event: 'deactivated',
    }).catch(() => {});

    return { enabled: false };
  }
}

async function notifyYessweraRegistration(payload: {
  slug: string;
  name: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  apiKey: string;
  event: 'activated' | 'deactivated';
}): Promise<{ coverage: boolean; driversInZone: number; message: string } | null> {
  const registrationKey = process.env.YESSWERA_REGISTRATION_KEY;
  if (!registrationKey) return null;

  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const sigPayload = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac('sha256', registrationKey)
    .update(sigPayload)
    .digest('hex');

  const res = await fetch(YESSWERA_REGISTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tonalli-Timestamp': timestamp,
      'X-Tonalli-Signature': signature,
    },
    body,
    signal: AbortSignal.timeout(5000),
  });

  if (res.ok) {
    try {
      const json = await res.json() as Record<string, unknown>;
      if (json && typeof json.coverage === 'boolean') {
        return { coverage: json.coverage as boolean, driversInZone: (json.driversInZone as number) ?? 0, message: (json.message as string) ?? '' };
      }
    } catch { /* non-JSON response */ }
  }
  return null;
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
