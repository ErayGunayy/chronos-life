/**
 * The single on/off switch for accounts + Supabase persistence (CLAUDE.md §8).
 * When both public env vars are set, the app requires Google sign-in and stores
 * each person's data in Supabase (RLS-isolated). When unset, the app falls back
 * to the single-user, file-backed dev mode — no auth, works offline.
 *
 * NEXT_PUBLIC_* so the same check works in the browser (login button) and on the
 * server (middleware, request context).
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
