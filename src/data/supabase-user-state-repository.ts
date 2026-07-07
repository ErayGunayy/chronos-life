import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { rowToUserState, userStateToColumns } from '@/data/supabase-mappers';
import {
  EMPTY_USER_STATE,
  freezeUserState,
  type UserState,
  type UserStateRepository,
} from '@/data/user-state-repository';
import type { ChapterRecord } from '@/domain/chapters/types';
import type { SleepWindow } from '@/domain/home/types';

const TABLE = 'user_state';
const MAX_ATTEMPTS = 5;

// The raw row as Supabase returns it (jsonb parsed to plain, mutable values).
interface StateRow {
  category_colors: Record<string, number>;
  sleep_window: SleepWindow | null;
  chapters: ChapterRecord[];
  dismissed_chapter_keys: string[];
  updated_at: string;
}

/**
 * Postgres-backed UserStateRepository (CLAUDE.md §8). `update` reproduces the
 * file store's serialized read-modify-write with optimistic concurrency: read
 * the row, apply the pure updater, then write only if `updated_at` hasn't moved
 * since the read — retrying on a lost race. This holds across app instances
 * where the file store's in-process write-queue could not.
 */
export class SupabaseUserStateRepository implements UserStateRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async get(userId: string): Promise<UserState> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle<StateRow>();
    if (error) throw new Error(`Couldn't load your settings: ${error.message}`);
    return data ? rowToUserState(data) : EMPTY_USER_STATE;
  }

  async update(userId: string, updater: (state: UserState) => UserState): Promise<UserState> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const { data: current, error: readError } = await this.supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle<StateRow>();
      if (readError) throw new Error(`Couldn't load your settings: ${readError.message}`);

      const previous = current ? rowToUserState(current) : EMPTY_USER_STATE;
      const next = freezeUserState(updater(previous));
      const columns = { ...userStateToColumns(next), updated_at: new Date().toISOString() };

      if (!current) {
        const { error: insertError } = await this.supabase
          .from(TABLE)
          .insert({ user_id: userId, ...columns });
        if (!insertError) return next;
        if (!isUniqueViolation(insertError)) {
          throw new Error(`Couldn't save your settings: ${insertError.message}`);
        }
        continue; // Someone inserted first — retry, now as an update.
      }

      const { data: updated, error: updateError } = await this.supabase
        .from(TABLE)
        .update(columns)
        .eq('user_id', userId)
        .eq('updated_at', current.updated_at)
        .select('user_id');
      if (updateError) throw new Error(`Couldn't save your settings: ${updateError.message}`);
      if ((updated?.length ?? 0) > 0) return next;
      // 0 rows → another write won the race since our read; loop and retry.
    }
    throw new Error('Couldn’t save your settings after several tries — please try again.');
  }
}

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === '23505';
}
