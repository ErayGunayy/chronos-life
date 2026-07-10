import * as Sentry from '@sentry/nextjs';

// Browser-side error monitoring. DSN-gated and PII-free, matching the server
// config. Next auto-loads this file for the client bundle.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

// Lets Sentry tie client-side navigations to traces (no-op until init runs).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
