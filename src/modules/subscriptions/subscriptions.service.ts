import { prisma } from '../../config/database';
import { stripe, getPlanFromPriceId, PLAN_CONFIG } from '../../config/stripe';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import type Stripe from 'stripe';

export async function createCheckoutSession(tenantId: string, priceId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { users: { where: { role: 'owner' }, take: 1 } },
  });

  if (!tenant) throw new AppError(404, 'Tenant no encontrado', 'NOT_FOUND');

  // Get or create Stripe customer
  let customerId = tenant.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: tenant.users[0]?.email || undefined,
      name: tenant.name,
      metadata: { tenantId },
    });
    customerId = customer.id;
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { stripeCustomerId: customerId },
    });
  }

  // If already subscribed, redirect to portal instead
  if (tenant.stripeSubId) {
    throw new AppError(400, 'Ya tienes una suscripción activa. Usa el portal para cambiar de plan.', 'ALREADY_SUBSCRIBED');
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.APP_BASE_URL}/dashboard/settings?subscription=success`,
    cancel_url: `${env.APP_BASE_URL}/dashboard/settings?subscription=cancelled`,
    metadata: { tenantId },
    subscription_data: {
      metadata: { tenantId },
    },
  });

  return { url: session.url };
}

export async function createPortalSession(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

  if (!tenant?.stripeCustomerId) {
    throw new AppError(400, 'No tienes una suscripción para gestionar', 'NO_SUBSCRIPTION');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: `${env.APP_BASE_URL}/dashboard/settings`,
  });

  return { url: session.url };
}

export async function getSubscriptionStatus(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: true,
      stripeSubId: true,
      stripePriceId: true,
      trialEndsAt: true,
      planExpiresAt: true,
      maxTables: true,
      maxUsers: true,
      maxProducts: true,
    },
  });

  if (!tenant) throw new AppError(404, 'Tenant no encontrado', 'NOT_FOUND');

  const isTrialing = tenant.trialEndsAt && new Date() < tenant.trialEndsAt;
  const isExpired = tenant.planExpiresAt && new Date() > tenant.planExpiresAt;

  return {
    plan: tenant.plan,
    hasSubscription: !!tenant.stripeSubId,
    isTrialing,
    isExpired: isExpired && !tenant.stripeSubId,
    trialEndsAt: tenant.trialEndsAt,
    planExpiresAt: tenant.planExpiresAt,
    limits: {
      maxTables: tenant.maxTables,
      maxUsers: tenant.maxUsers,
      maxProducts: tenant.maxProducts,
    },
  };
}

// ─── Webhook Handlers ────────────────────────────

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const tenantId = session.metadata?.tenantId;
  if (!tenantId) return;

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);
  const limits = PLAN_CONFIG[plan];

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      plan,
      stripeSubId: subscription.id,
      stripePriceId: priceId,
      maxTables: limits.maxTables === -1 ? 999 : limits.maxTables,
      maxUsers: limits.maxUsers === -1 ? 999 : limits.maxUsers,
      maxProducts: limits.maxProducts === -1 ? 9999 : limits.maxProducts,
      planExpiresAt: new Date((subscription as any).current_period_end * 1000),
      status: 'active',
    },
  });
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) return;

  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);
  const limits = PLAN_CONFIG[plan];

  const data: Record<string, unknown> = {
    plan,
    stripePriceId: priceId,
    stripeSubId: subscription.id,
    maxTables: limits.maxTables === -1 ? 999 : limits.maxTables,
    maxUsers: limits.maxUsers === -1 ? 999 : limits.maxUsers,
    maxProducts: limits.maxProducts === -1 ? 9999 : limits.maxProducts,
    planExpiresAt: new Date((subscription as any).current_period_end * 1000),
  };

  if (subscription.status === 'active' || subscription.status === 'trialing') {
    data.status = 'active';
  }

  await prisma.tenant.update({ where: { id: tenantId }, data });
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) return;

  // Downgrade to basic limits
  const limits = PLAN_CONFIG.basic;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      plan: 'basic',
      stripeSubId: null,
      stripePriceId: null,
      maxTables: limits.maxTables,
      maxUsers: limits.maxUsers,
      maxProducts: limits.maxProducts,
      planExpiresAt: null,
    },
  });
}

export async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const tenant = await prisma.tenant.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (tenant) {
    console.warn(`[Stripe] Payment failed for tenant ${tenant.id} (${tenant.name})`);
    // Don't suspend immediately — Stripe retries automatically
    // After all retries fail, subscription.deleted event will fire

    // Send payment failed notification
    const { sendPaymentFailedEmail } = await import('../notifications/triggers.service');
    sendPaymentFailedEmail(tenant.id).catch((err) => {
      console.error('[Stripe] Failed to send payment failed email:', err);
    });
  }
}
