import { describe, expect, it } from 'vitest';

import {
  lifeEventToRow,
  rowToLifeEvent,
  rowToUserState,
  userStateToColumns,
  type LifeEventRow,
} from '@/data/supabase-mappers';
import type { LifeEvent } from '@/domain/life-event/types';

const event: LifeEvent = Object.freeze({
  id: 'event-1',
  userId: 'user-1',
  title: 'Coffee with Sarah',
  description: null,
  category: 'Social',
  categoryConfidence: 0.8,
  startAt: '2026-07-01T09:00:00.000Z',
  endAt: '2026-07-01T10:00:00.000Z',
  timezone: 'Europe/Istanbul',
  kind: 'substantive',
  source: 'life-conversation',
  people: ['Sarah'],
  place: 'Kadıköy',
  notes: null,
  version: 1,
  createdAt: '2026-07-01T20:00:00.000Z',
  updatedAt: '2026-07-01T20:00:00.000Z',
});

describe('life event mappers', () => {
  it('round-trips a life event through row form unchanged', () => {
    expect(rowToLifeEvent(lifeEventToRow(event))).toEqual(event);
  });

  it('maps snake_case columns to the domain shape', () => {
    const row = lifeEventToRow(event);
    expect(row.user_id).toBe('user-1');
    expect(row.category_confidence).toBe(0.8);
    expect(row.start_at).toBe('2026-07-01T09:00:00.000Z');
  });

  it('normalizes a non-ISO timestamptz and a null people array', () => {
    const row: LifeEventRow = {
      ...lifeEventToRow(event),
      start_at: '2026-07-01 09:00:00+00',
      people: null,
    };
    const mapped = rowToLifeEvent(row);
    expect(mapped.startAt).toBe('2026-07-01T09:00:00.000Z');
    expect(mapped.people).toEqual([]);
  });
});

describe('user state mappers', () => {
  it('defaults a missing row to empty state', () => {
    const state = rowToUserState(null);
    expect(state.categoryColors).toEqual({});
    expect(state.sleepWindow).toBeNull();
    expect(state.chapters).toEqual([]);
    expect(state.dismissedChapterKeys).toEqual([]);
  });

  it('round-trips category colors and sleep window through columns', () => {
    const columns = userStateToColumns(
      rowToUserState({
        category_colors: { Learning: 0, Health: 1 },
        sleep_window: { start: '23:00', end: '07:00' },
        chapters: [],
        dismissed_chapter_keys: ['place:istanbul'],
      }),
    );
    expect(columns.category_colors).toEqual({ Learning: 0, Health: 1 });
    expect(columns.sleep_window).toEqual({ start: '23:00', end: '07:00' });
    expect(columns.dismissed_chapter_keys).toEqual(['place:istanbul']);
  });
});
