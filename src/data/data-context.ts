import 'server-only';

import { getRepository } from '@/data/get-repository';
import { getStateRepository } from '@/data/get-state-repository';
import { InMemoryRateLimiter, type RateLimiter } from '@/data/rate-limiter';
import { SupabaseLifeEventRepository } from '@/data/supabase-life-event-repository';
import { SupabaseRateLimiter } from '@/data/supabase-rate-limiter';
import { SupabaseUserStateRepository } from '@/data/supabase-user-state-repository';
import type { LifeEventRepository } from '@/data/life-event-repository';
import type { UserStateRepository } from '@/data/user-state-repository';
import { fail } from '@/lib/api/envelope';
import { DEV_USER_ID } from '@/lib/dev-user';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabase } from '@/lib/supabase/server';

/** Thrown when Supabase is configured but the request has no signed-in user. */
export class UnauthorizedError extends Error {
  constructor() {
    super('You need to sign in.');
    this.name = 'UnauthorizedError';
  }
}

export interface DataContext {
  readonly userId: string;
  readonly events: LifeEventRepository;
  readonly state: UserStateRepository;
}

/**
 * The one place the app decides who the user is and where their data lives.
 * Configured: the signed-in Supabase user + RLS-scoped repositories. Not
 * configured: the fixed dev user + file-backed repositories (offline dev). This
 * is the whole `DEV_USER_ID` → `auth.uid()` swap CLAUDE.md §8 was built for.
 */
export async function resolveDataContext(): Promise<DataContext> {
  if (!isSupabaseConfigured()) {
    return { userId: DEV_USER_ID, events: getRepository(), state: getStateRepository() };
  }
  const { supabase, userId } = await authedSupabase();
  return {
    userId,
    events: new SupabaseLifeEventRepository(supabase),
    state: new SupabaseUserStateRepository(supabase),
  };
}

/** Signed-in user + the daily AI rate limiter, for the capture route. */
export interface RateLimitContext {
  readonly userId: string;
  readonly limiter: RateLimiter;
}

// One in-memory limiter shared across requests in the file-backed dev process.
let devLimiter: RateLimiter | null = null;

/**
 * The limiter + user for a request that calls the model. Supabase-backed and
 * authoritative when configured; in dev it's the single in-memory limiter for
 * the fixed dev user (no auth). Throws UnauthorizedError when Supabase is
 * configured but nobody is signed in.
 */
export async function resolveRateLimiter(): Promise<RateLimitContext> {
  if (!isSupabaseConfigured()) {
    devLimiter ??= new InMemoryRateLimiter();
    return { userId: DEV_USER_ID, limiter: devLimiter };
  }
  const { supabase, userId } = await authedSupabase();
  return { userId, limiter: new SupabaseRateLimiter(supabase) };
}

/** Resolve the signed-in Supabase user or throw. Assumes Supabase is configured. */
async function authedSupabase() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();
  return { supabase, userId: user.id };
}

/** Standard 401 envelope for an API route when the caller isn't signed in. */
export function unauthorizedResponse(): Response {
  return Response.json(fail('Please sign in to continue.'), { status: 401 });
}
