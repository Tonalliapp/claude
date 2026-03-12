import * as Sentry from '@sentry/react';

const meta = import.meta as any;
const dsn = meta.env?.VITE_SENTRY_DSN as string | undefined;

if (dsn) {
  Sentry.init({
    dsn,
    environment: meta.env?.MODE ?? 'production',
    tracesSampleRate: 0.2,
  });
}
