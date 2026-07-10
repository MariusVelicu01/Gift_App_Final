import * as Sentry from '@sentry/react';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 0 : 0.2,
    beforeSend(event) {
      if (__DEV__) return null;
      return event;
    },
  });
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (__DEV__) {
    console.error('[Sentry]', error, context);
    return;
  }
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}

export function setSentryUser(uid: string) {
  Sentry.setUser({ id: uid });
}

export function clearSentryUser() {
  Sentry.setUser(null);
}
