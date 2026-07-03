/**
 * Single-user v0 (CLAUDE.md §8): one fixed owner until Supabase auth lands.
 * UUID-shaped so the eventual `auth.uid()` migration is a value swap, not a
 * schema change.
 */
export const DEV_USER_ID = '00000000-0000-4000-8000-000000000001';
