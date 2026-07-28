// Must be imported before any other module (express, http, etc.) so Sentry's
// auto-instrumentation can hook in. See server.ts for import order.
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 0,
  });
}
