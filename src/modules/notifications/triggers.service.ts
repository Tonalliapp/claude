import { prisma } from '../../config/database';
import { resend } from '../../config/email';
import * as templates from './email.templates';

const FROM_EMAIL = process.env.EMAIL_FROM || 'Tonalli <noreply@tonalli.app>';
const ONE_DAY = 24 * 60 * 60 * 1000;

async function hasRecentNotification(tenantId: string, type: string, withinDays: number): Promise<boolean> {
  const since = new Date(Date.now() - withinDays * ONE_DAY);
  const count = await (prisma as any).notification.count({
    where: { tenantId, type, sentAt: { gte: since } },
  });
  return count > 0;
}

async function recordNotification(tenantId: string, type: string, metadata: Record<string, unknown> = {}) {
  await (prisma as any).notification.create({
    data: { tenantId, type, metadata },
  });
}

async function getOwnerEmail(tenantId: string): Promise<{ email: string; name: string } | null> {
  const owner = await prisma.user.findFirst({
    where: { tenantId, role: 'owner', active: true, email: { not: null } },
    select: { email: true, name: true },
  });
  return owner?.email ? { email: owner.email, name: owner.name } : null;
}

export async function checkTrialExpiring() {
  const threeDaysFromNow = new Date(Date.now() + 3 * ONE_DAY);
  const now = new Date();

  const tenants = await prisma.tenant.findMany({
    where: {
      trialEndsAt: { lte: threeDaysFromNow, gte: now },
      status: 'active',
      stripeSubId: null,
    },
    select: { id: true, name: true },
  });

  for (const tenant of tenants) {
    if (await hasRecentNotification(tenant.id, 'trial_ending', 3)) continue;

    const owner = await getOwnerEmail(tenant.id);
    if (!owner) continue;

    const daysLeft = Math.ceil((threeDaysFromNow.getTime() - now.getTime()) / ONE_DAY);
    const { subject, html } = templates.trialEndingReminder(tenant.name, daysLeft);

    try {
      await resend.emails.send({ from: FROM_EMAIL, to: owner.email, subject, html });
      await recordNotification(tenant.id, 'trial_ending', { email: owner.email });
    } catch (err) {
      console.error(`[Notifications] Failed to send trial reminder for ${tenant.name}:`, err);
    }
  }
}

export async function checkPlanExpiring() {
  const sevenDaysFromNow = new Date(Date.now() + 7 * ONE_DAY);
  const now = new Date();

  const tenants = await prisma.tenant.findMany({
    where: {
      planExpiresAt: { lte: sevenDaysFromNow, gte: now },
      status: 'active',
    },
    select: { id: true, name: true },
  });

  for (const tenant of tenants) {
    if (await hasRecentNotification(tenant.id, 'plan_expiring', 7)) continue;

    const owner = await getOwnerEmail(tenant.id);
    if (!owner) continue;

    const { subject, html } = templates.suspensionWarning(tenant.name);

    try {
      await resend.emails.send({ from: FROM_EMAIL, to: owner.email, subject, html });
      await recordNotification(tenant.id, 'plan_expiring', { email: owner.email });
    } catch (err) {
      console.error(`[Notifications] Failed to send plan expiring for ${tenant.name}:`, err);
    }
  }
}

export async function checkLowStockAlerts() {
  const tenants = await prisma.tenant.findMany({
    where: { status: 'active' },
    select: { id: true, name: true },
  });

  for (const tenant of tenants) {
    if (await hasRecentNotification(tenant.id, 'low_stock', 1)) continue;

    const lowIngredients = await prisma.$queryRaw<
      { name: string; current_stock: string; min_stock: string; unit: string }[]
    >`
      SELECT name, current_stock, min_stock, unit
      FROM ingredients
      WHERE tenant_id = ${tenant.id}::uuid
        AND active = true
        AND min_stock > 0
        AND current_stock <= min_stock
    `;

    if (lowIngredients.length === 0) continue;

    const owner = await getOwnerEmail(tenant.id);
    if (!owner) continue;

    const { subject, html } = templates.lowStockAlert(
      tenant.name,
      lowIngredients.map((i) => ({
        name: i.name,
        current: Number(i.current_stock),
        min: Number(i.min_stock),
        unit: i.unit,
      })),
    );

    try {
      await resend.emails.send({ from: FROM_EMAIL, to: owner.email, subject, html });
      await recordNotification(tenant.id, 'low_stock', { count: lowIngredients.length });
    } catch (err) {
      console.error(`[Notifications] Failed to send low stock alert for ${tenant.name}:`, err);
    }
  }
}

export async function checkWeeklyDigest() {
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek !== 1) return; // Only on Mondays

  const tenants = await prisma.tenant.findMany({
    where: { status: 'active' },
    select: { id: true, name: true },
  });

  const weekAgo = new Date(Date.now() - 7 * ONE_DAY);

  for (const tenant of tenants) {
    if (await hasRecentNotification(tenant.id, 'weekly_digest', 6)) continue;

    const owner = await getOwnerEmail(tenant.id);
    if (!owner) continue;

    const orders = await prisma.order.findMany({
      where: { tenantId: tenant.id, status: 'paid', paidAt: { gte: weekAgo } },
      select: { total: true },
    });

    if (orders.length === 0) continue;

    const revenue = orders.reduce((sum, o) => sum + Number(o.total), 0);

    const topItem = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { tenantId: tenant.id, status: 'paid', paidAt: { gte: weekAgo } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 1,
    });

    let topProduct = 'N/A';
    if (topItem.length > 0) {
      const product = await prisma.product.findUnique({
        where: { id: topItem[0].productId },
        select: { name: true },
      });
      topProduct = product?.name ?? 'N/A';
    }

    const { subject, html } = templates.weeklyActivityDigest(tenant.name, {
      orders: orders.length,
      revenue,
      topProduct,
    });

    try {
      await resend.emails.send({ from: FROM_EMAIL, to: owner.email, subject, html });
      await recordNotification(tenant.id, 'weekly_digest', { orders: orders.length, revenue });
    } catch (err) {
      console.error(`[Notifications] Failed to send weekly digest for ${tenant.name}:`, err);
    }
  }
}

export async function sendPaymentFailedEmail(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true },
  });
  if (!tenant) return;

  if (await hasRecentNotification(tenantId, 'payment_failed', 1)) return;

  const owner = await getOwnerEmail(tenantId);
  if (!owner) return;

  const { subject, html } = templates.paymentFailed(tenant.name);

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: owner.email, subject, html });
    await recordNotification(tenantId, 'payment_failed', { email: owner.email });
  } catch (err) {
    console.error(`[Notifications] Failed to send payment failed for ${tenant.name}:`, err);
  }
}

let triggerInterval: ReturnType<typeof setInterval> | null = null;

export function startTriggers() {
  console.log('[Notifications] Starting auto-triggers (24h interval)');

  // Run immediately on start
  runAllChecks();

  // Then every 24 hours
  triggerInterval = setInterval(runAllChecks, 24 * 60 * 60 * 1000);
}

export function stopTriggers() {
  if (triggerInterval) {
    clearInterval(triggerInterval);
    triggerInterval = null;
  }
}

async function runAllChecks() {
  try {
    await checkTrialExpiring();
    await checkPlanExpiring();
    await checkLowStockAlerts();
    await checkWeeklyDigest();
    console.log('[Notifications] Auto-checks completed');
  } catch (err) {
    console.error('[Notifications] Auto-check error:', err);
  }
}
