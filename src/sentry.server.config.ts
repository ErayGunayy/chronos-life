import * as Sentry from '@sentry/nextjs';

// Error monitoring, inert until a DSN is set — no DSN, no init, zero behavior
// change (the same optional pattern as Supabase). Set NEXT_PUBLIC_SENTRY_DSN in
// production to turn it on. sendDefaultPii stays false on purpose: this is a
// memory product, so error reports must never carry request bodies, narratives,
// or user identifiers by default (§9).
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}
