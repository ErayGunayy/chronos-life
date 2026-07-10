import * as Sentry from '@sentry/nextjs';

// Edge runtime (middleware). Same DSN-gated, PII-free init as the server config.
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}
