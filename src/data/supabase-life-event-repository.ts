import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { LifeEventRepository } from '@/data/life-event-repository';
import { lifeEventToRow, rowToLifeEvent, type LifeEventRow } from '@/data/supabase-mappers';
import type { LifeEvent } from '@/domain/life-event/types';

const TABLE = 'life_events';

/**
 * Postgres-backed LifeEventRepository (CLAUDE.md §8). Constructed per request
 * with a Supabase client carrying the user's session, so RLS scopes every query
 * to the owner. The explicit `user_id` filters are defense-in-depth on top.
 */
export class SupabaseLifeEventRepository implements LifeEventRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async save(event: LifeEvent): Promise<void> {
    const { error } = await this.supabase
      .from(TABLE)
      .upsert(lifeEventToRow(event), { onConflict: 'id' });
    if (error) throw new Error(`Couldn't save that memory: ${error.message}`);
  }

  async getById(userId: string, id: string): Promise<LifeEvent | null> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle<LifeEventRow>();
    if (error) throw new Error(`Couldn't load that memory: ${error.message}`);
    return data ? rowToLifeEvent(data) : null;
  }

  async listBetween(userId: string, fromUtc: string, toUtc: string): Promise<LifeEvent[]> {
    // Overlap, half-open [fromUtc, toUtc): start_at < to AND end_at > from.
    const { data, error } = await this.supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .lt('start_at', toUtc)
      .gt('end_at', fromUtc)
      .order('start_at', { ascending: true })
      .order('id', { ascending: true })
      .returns<LifeEventRow[]>();
    if (error) throw new Error(`Couldn't load your memories: ${error.message}`);
    return (data ?? []).map(rowToLifeEvent);
  }

  async listAll(userId: string): Promise<LifeEvent[]> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('start_at', { ascending: true })
      .order('id', { ascending: true })
      .returns<LifeEventRow[]>();
    if (error) throw new Error(`Couldn't load your memories: ${error.message}`);
    return (data ?? []).map(rowToLifeEvent);
  }

  async deleteById(userId: string, id: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('id', id)
      .select('id');
    if (error) throw new Error(`Couldn't delete that memory: ${error.message}`);
    return (data?.length ?? 0) > 0;
  }

  async deleteAll(userId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .delete()
      .eq('user_id', userId)
      .select('id');
    if (error) throw new Error(`Couldn't delete your memories: ${error.message}`);
    return data?.length ?? 0;
  }
}
