import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  dailyCaptureLimit,
  nextUtcMidnight,
  utcDay,
  type RateLimiter,
  type RateLimitResult,
} from '@/data/rate-limiter';

/**
 * Supabase-backed daily limiter — authoritative across serverless instances.
 * Increments the caller's row in public.ai_usage atomically via the
 * increment_ai_usage RPC (SECURITY INVOKER, so RLS + auth.uid() still apply and
 * a caller can only ever touch their own counter).
 *
 * Fails OPEN: if the RPC errors we allow the capture. A limiter outage must
 * never stop someone from recording their life (§2 / §5.11) — and in practice
 * the RPC only fails when Supabase itself is down, in which case persistence is
 * already failing too, so failing open here adds no real cost exposure.
 */
export class SupabaseRateLimiter implements RateLimiter {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly limit: number = dailyCaptureLimit(),
  ) {}

  async hit(): Promise<RateLimitResult> {
    const resetAt = nextUtcMidnight();
    const { data, error } = await this.supabase.rpc('increment_ai_usage', {
      p_date: utcDay(),
    });

    if (error || typeof data !== 'number') {
      console.error('rate limiter unavailable, failing open', error);
      return { allowed: true, count: 0, limit: this.limit, resetAt };
    }

    return { allowed: data <= this.limit, count: data, limit: this.limit, resetAt };
  }
}
