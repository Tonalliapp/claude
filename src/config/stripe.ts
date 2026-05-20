import Stripe from 'stripe';
import { env } from './env';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia' as string as any,
});

export const PLAN_CONFIG = {
  basic: {
    maxTables: 5,
    maxUsers: 3,
    maxProducts: 20,
    maxCashRegisters: 1,
    features: ['menu', 'orders', 'pos', 'inventory', 'basic_reports', 'qr_branding'],
  },
  professional: {
    maxTables: 15,
    maxUsers: 10,
    maxProducts: 60,
    maxCashRegisters: 3,
    features: ['menu', 'orders', 'pos', 'inventory', 'full_reports', 'qr_branding'],
  },
  premium: {
    maxTables: -1, // unlimited
    maxUsers: -1,
    maxProducts: -1,
    maxCashRegisters: -1,
    features: ['menu', 'orders', 'pos', 'inventory', 'full_reports', 'export_reports', 'qr_branding', 'priority_support'],
  },
} as const;

export const PRICE_IDS = {
  basic_monthly: env.STRIPE_PRICE_BASIC_MONTHLY,
  basic_yearly: env.STRIPE_PRICE_BASIC_YEARLY,
  professional_monthly: env.STRIPE_PRICE_PRO_MONTHLY,
  professional_yearly: env.STRIPE_PRICE_PRO_YEARLY,
  premium_monthly: env.STRIPE_PRICE_PREMIUM_MONTHLY,
  premium_yearly: env.STRIPE_PRICE_PREMIUM_YEARLY,
};

export function getPlanFromPriceId(priceId: string): 'basic' | 'professional' | 'premium' {
  if (priceId === PRICE_IDS.basic_monthly || priceId === PRICE_IDS.basic_yearly) return 'basic';
  if (priceId === PRICE_IDS.professional_monthly || priceId === PRICE_IDS.professional_yearly) return 'professional';
  return 'premium';
}
