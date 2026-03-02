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
    console.log('[Notifications] Auto-checks completed');
  } catch (err) {
    console.error('[Notifications] Auto-check error:', err);
  }
}
