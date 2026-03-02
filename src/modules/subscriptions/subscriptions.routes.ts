import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validator';
import { stripe } from '../../config/stripe';
import { env } from '../../config/env';
import { checkoutSchema } from './subscriptions.schema';
import {
  createCheckoutSession,
  createPortalSession,
  getSubscriptionStatus,
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoiceFailed,
} from './subscriptions.service';

const router = Router();

// ─── Create Checkout Session ─────────────────────
router.post(
  '/checkout',
  authenticate,
  roleGuard('owner'),
  validate({ body: checkoutSchema }),
  async (req, res, next) => {
    try {
      const result = await createCheckoutSession(req.user!.tenantId, req.body.priceId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Customer Portal ─────────────────────────────
router.post(
  '/portal',
  authenticate,
  roleGuard('owner'),
  async (req, res, next) => {
    try {
      const result = await createPortalSession(req.user!.tenantId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Subscription Status ─────────────────────────
router.get(
  '/status',
  authenticate,
  async (req, res, next) => {
    try {
      const result = await getSubscriptionStatus(req.user!.tenantId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Stripe Webhook ──────────────────────────────
router.post(
  '/webhook',
  async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', err);
      return res.status(400).send('Webhook signature verification failed');
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object);
          break;
        case 'invoice.payment_failed':
          await handleInvoiceFailed(event.data.object);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error(`[Stripe Webhook] Error handling ${event.type}:`, err);
    }

    res.json({ received: true });
  },
);

export default router;
