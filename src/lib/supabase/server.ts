import 'server-only';

import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/config';

/**
 * A Supabase client bound to the current request's cookies, so every query runs
 * as the signed-in user and RLS does the isolation. Only call when Supabase is
 * configured (see isSupabaseConfigured).
 */
export async function createServerSupabase(): Promise<SupabaseClient> {
  const url = SUPABASE_URL;
  const key = SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase is not configured.');

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // session refresh in middleware writes the cookies instead — safe.
        }
      },
    },
  });
}
