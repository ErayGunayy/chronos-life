import 'server-only';

import { getRepository } from '@/data/get-repository';
import { getStateRepository } from '@/data/get-state-repository';
import { SupabaseLifeEventRepository } from '@/data/supabase-life-event-repository';
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
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();
  return {
    userId: user.id,
    events: new SupabaseLifeEventRepository(supabase),
    state: new SupabaseUserStateRepository(supabase),
  };
}

/** For routes that need auth but no repository (capture). Returns the user id. */
export async function requireUser(): Promise<string> {
  if (!isSupabaseConfigured()) return DEV_USER_ID;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();
  return user.id;
}

/** Standard 401 envelope for an API route when the caller isn't signed in. */
export function unauthorizedResponse(): Response {
  return Response.json(fail('Please sign in to continue.'), { status: 401 });
}
