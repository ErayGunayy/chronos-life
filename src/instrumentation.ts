// Next.js instrumentation hook — loads the right Sentry init per runtime. Both
// configs are DSN-gated, so with no SENTRY DSN set this is entirely inert.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Reports errors thrown in nested React Server Components to Sentry (no-op
// without a DSN).
export { captureRequestError as onRequestError } from '@sentry/nextjs';
