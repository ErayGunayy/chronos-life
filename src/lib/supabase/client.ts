import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/config';

/** Browser Supabase client for client components (sign in / sign out). */
export function createBrowserSupabase(): SupabaseClient {
  const url = SUPABASE_URL;
  const key = SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase is not configured.');
  return createBrowserClient(url, key);
}
