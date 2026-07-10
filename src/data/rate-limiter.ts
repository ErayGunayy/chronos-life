/**
 * Per-user daily cap on the paid/free-tier AI extraction endpoint — a cost and
 * abuse guard for the public launch. Every capture calls a model, so an
 * authenticated user (or a compromised account) could otherwise run the bill or
 * exhaust the shared free-tier quota without bound. Enforced at the one
 * chokepoint that calls the model: the capture route.
 *
 * The window is a UTC calendar day. Nothing here judges the user — reaching the
 * cap is a system limit, surfaced kindly (CLAUDE.md §2, never shame). Pure and
 * framework-free so the decision is unit-testable; the Supabase-backed
 * implementation lives in supabase-rate-limiter.ts.
 */
export interface RateLimitResult {
  /** True when this use is within the cap and the caller may proceed. */
  readonly allowed: boolean;
  /** Uses recorded for the user today, including this one. */
  readonly count: number;
  readonly limit: number;
  /** ISO instant when the window rolls over (next UTC midnight). */
  readonly resetAt: string;
}

export interface RateLimiter {
  /** Atomically record one use for `userId` today and report whether it's within the cap. */
  hit(userId: string): Promise<RateLimitResult>;
}

const DEFAULT_DAILY_LIMIT = 50;

/** Daily capture cap, overridable per deployment via CHRONOS_DAILY_CAPTURE_LIMIT. */
export function dailyCaptureLimit(): number {
  const raw = process.env.CHRONOS_DAILY_CAPTURE_LIMIT?.trim();
  if (!raw) return DEFAULT_DAILY_LIMIT;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_DAILY_LIMIT;
}

/** UTC calendar day as YYYY-MM-DD — the key the counter is bucketed by. */
export function utcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Next UTC midnight after `now`, as an ISO instant — when the window resets. */
export function nextUtcMidnight(now: Date = new Date()): string {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return next.toISOString();
}

/**
 * In-memory limiter for the file-backed dev/single-user mode and for tests.
 * Deliberately not shared across serverless instances — the public deployment
 * uses the Supabase-backed limiter, which is authoritative across instances.
 * In single-user dev this is exactly right: it's just you, and it resets when
 * the dev server does.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly counts = new Map<string, { day: string; count: number }>();

  constructor(private readonly limit: number = dailyCaptureLimit()) {}

  async hit(userId: string): Promise<RateLimitResult> {
    const day = utcDay();
    const entry = this.counts.get(userId);
    const count = entry && entry.day === day ? entry.count + 1 : 1;
    this.counts.set(userId, { day, count });
    return {
      allowed: count <= this.limit,
      count,
      limit: this.limit,
      resetAt: nextUtcMidnight(),
    };
  }
}
