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
  basic_monthly: 'price_1T6LW32QogbirSNpeE3q01Si',
  basic_yearly: 'price_1T6LWD2QogbirSNp9HOxbCch',
  professional_monthly: 'price_1T6LWO2QogbirSNpFideOTDG',
  professional_yearly: 'price_1T6LWe2QogbirSNphZ6ToNmj',
  premium_monthly: 'price_1T6LWs2QogbirSNptsw8JCiL',
  premium_yearly: 'price_1T6LY62QogbirSNpO3RP8Edr',
} as const;

export function getPlanFromPriceId(priceId: string): 'basic' | 'professional' | 'premium' {
  if (priceId === PRICE_IDS.basic_monthly || priceId === PRICE_IDS.basic_yearly) return 'basic';
  if (priceId === PRICE_IDS.professional_monthly || priceId === PRICE_IDS.professional_yearly) return 'professional';
  return 'premium';
}
