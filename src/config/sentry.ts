import * as Sentry from '@sentry/node';
import { env } from './env';

export function initSentry() {
  if (!env.SENTRY_DSN) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    sendDefaultPii: true,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.2 : 1.0,
  });
  console.log('[Sentry] Initialized');
}

export function captureException(err: Error) {
  if (env.SENTRY_DSN) {
    Sentry.captureException(err);
  }
}

export function setupSentryErrorHandler(app: import('express').Express) {
  if (env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }
}
