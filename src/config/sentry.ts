import { env } from './env';

let Sentry: any = null;

export function initSentry() {
  if (!env.SENTRY_DSN) return;

  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: env.NODE_ENV === 'production' ? 0.2 : 1.0,
    });
    console.log('[Sentry] Initialized');
  } catch {
    console.warn('[Sentry] @sentry/node not installed, skipping');
  }
}

export function captureException(err: Error) {
  if (Sentry) {
    Sentry.captureException(err);
  }
}

export function sentryErrorHandler(err: any, req: any, res: any, next: any) {
  if (Sentry) {
    Sentry.captureException(err);
  }
  next(err);
}
