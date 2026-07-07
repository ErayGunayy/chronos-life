import { freezeUserState, type UserState } from '@/data/user-state-repository';
import type { ChapterRecord } from '@/domain/chapters/types';
import type { SleepWindow } from '@/domain/home/types';
import type { LifeEvent } from '@/domain/life-event/types';

/**
 * Row ↔ domain mappers for the Supabase tables. Pure (no client, no I/O) so the
 * snake_case ↔ camelCase and timestamptz ↔ ISO-8601 translation is unit-tested
 * on its own; the repositories that call the DB are verified live.
 */

export interface LifeEventRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  category_confidence: number | null;
  start_at: string;
  end_at: string;
  timezone: string;
  kind: string;
  source: string;
  people: string[] | null;
  place: string | null;
  notes: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

/** Postgres timestamptz comes back in various shapes; normalize to ISO-8601 UTC. */
function toIso(value: string): string {
  return new Date(value).toISOString();
}

export function rowToLifeEvent(row: LifeEventRow): LifeEvent {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    category: row.category,
    categoryConfidence: row.category_confidence,
    startAt: toIso(row.start_at),
    endAt: toIso(row.end_at),
    timezone: row.timezone,
    kind: row.kind as LifeEvent['kind'],
    source: row.source as LifeEvent['source'],
    people: row.people ?? [],
    place: row.place,
    notes: row.notes,
    version: row.version,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function lifeEventToRow(event: LifeEvent): LifeEventRow {
  return {
    id: event.id,
    user_id: event.userId,
    title: event.title,
    description: event.description,
    category: event.category,
    category_confidence: event.categoryConfidence,
    start_at: event.startAt,
    end_at: event.endAt,
    timezone: event.timezone,
    kind: event.kind,
    source: event.source,
    people: [...event.people],
    place: event.place,
    notes: event.notes,
    version: event.version,
    created_at: event.createdAt,
    updated_at: event.updatedAt,
  };
}

export interface UserStateColumns {
  category_colors: Record<string, number>;
  sleep_window: SleepWindow | null;
  chapters: ChapterRecord[];
  dismissed_chapter_keys: string[];
}

export function rowToUserState(row: Partial<UserStateColumns> | null | undefined): UserState {
  return freezeUserState({
    categoryColors: row?.category_colors ?? {},
    sleepWindow: row?.sleep_window ?? null,
    chapters: row?.chapters ?? [],
    dismissedChapterKeys: row?.dismissed_chapter_keys ?? [],
  });
}

export function userStateToColumns(state: UserState): UserStateColumns {
  return {
    category_colors: { ...state.categoryColors },
    sleep_window: state.sleepWindow,
    chapters: [...state.chapters],
    dismissed_chapter_keys: [...state.dismissedChapterKeys],
  };
}
