import { describe, expect, it } from 'vitest';

import { createLifeEvent } from '@/domain/life-event/factory';
import type { LifeEvent, LifeEventKind } from '@/domain/life-event/types';
import { colorForCategoryIndex } from '@/domain/ring/palette';
import { buildRingSegments, type RingDayInput } from '@/domain/ring/segments';

let sequence = 0;

function utcEvent(overrides: {
  start: string;
  end: string;
  category?: string | null;
  kind?: LifeEventKind;
}): LifeEvent {
  sequence += 1;
  return createLifeEvent(
    {
      userId: 'user-a',
      title: overrides.kind === 'unremembered' ? '' : `Memory ${sequence}`,
      category: overrides.category ?? null,
      startAt: overrides.start,
      endAt: overrides.end,
      timezone: 'UTC',
      kind: overrides.kind ?? 'substantive',
      source: 'life-conversation',
    },
    { id: () => `event-${sequence}`, now: () => '2026-07-01T20:00:00.000Z' },
  );
}

function day(localDate: string, events: LifeEvent[]): RingDayInput {
  return {
    localDate,
    fromUtc: `${localDate}T00:00:00.000Z`,
    toUtc: nextDate(localDate),
    events,
  };
}

function nextDate(localDate: string): string {
  const [year, month, dayOfMonth] = localDate.split('-').map(Number);
  return `${new Date(Date.UTC(year, month - 1, dayOfMonth + 1)).toISOString().slice(0, 10)}T00:00:00.000Z`;
}

const COLORS = { Learning: 0, Health: 1, Family: 2 };

describe('buildRingSegments — single day (§5.2.1–§5.2.3)', () => {
  it('aggregates categories, splits gap kinds, and orders largest → smallest', () => {
    // Arrange — 09:00–11:00 Learning, 30m routine pause, 11:30–12:30 Health,
    // 90m forgotten gap, 14:00–15:00 Family, 15:00–16:00 unremembered.
    const events = [
      utcEvent({ start: '2026-07-01T09:00:00.000Z', end: '2026-07-01T11:00:00.000Z', category: 'Learning' }),
      utcEvent({ start: '2026-07-01T11:30:00.000Z', end: '2026-07-01T12:30:00.000Z', category: 'Health' }),
      utcEvent({ start: '2026-07-01T14:00:00.000Z', end: '2026-07-01T15:00:00.000Z', category: 'Family' }),
      utcEvent({ start: '2026-07-01T15:00:00.000Z', end: '2026-07-01T16:00:00.000Z', kind: 'unremembered' }),
    ];

    // Act
    const ring = buildRingSegments([day('2026-07-01', events)], COLORS);

    // Assert — order: Learning 120 > forgotten 90 > Family/Health/unremembered 60 > routine 30
    expect(ring.segments.map((segment) => [segment.kind, segment.durationMinutes])).toEqual([
      ['category', 120],
      ['forgotten', 90],
      ['category', 60],
      ['category', 60],
      ['unremembered', 60],
      ['routine-gap', 30],
    ]);
    expect(ring.totalMinutes).toBe(420);

    const shares = ring.segments.map((segment) => segment.share);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);

    const learning = ring.segments[0];
    if (learning.kind !== 'category') throw new Error('expected a category segment');
    expect(learning.category).toBe('Learning');
    expect(learning.color).toBe(colorForCategoryIndex(0));
  });

  it('renders each forgotten moment as its own tappable segment on a single day (§5.2.2)', () => {
    // Arrange — two separate ≥1h gaps
    const events = [
      utcEvent({ start: '2026-07-01T08:00:00.000Z', end: '2026-07-01T09:00:00.000Z', category: 'Learning' }),
      utcEvent({ start: '2026-07-01T10:30:00.000Z', end: '2026-07-01T11:00:00.000Z', category: 'Learning' }),
      utcEvent({ start: '2026-07-01T13:00:00.000Z', end: '2026-07-01T14:00:00.000Z', category: 'Learning' }),
    ];

    // Act
    const ring = buildRingSegments([day('2026-07-01', events)], COLORS);

    // Assert
    const forgotten = ring.segments.filter((segment) => segment.kind === 'forgotten');
    expect(forgotten).toHaveLength(2);
    for (const segment of forgotten) {
      if (segment.kind !== 'forgotten') continue;
      expect(segment.slices).toHaveLength(1);
    }
  });

  it('merges same-category overlaps instead of double-counting', () => {
    // Arrange — two Learning blocks overlapping 10:00–11:00
    const events = [
      utcEvent({ start: '2026-07-01T09:00:00.000Z', end: '2026-07-01T11:00:00.000Z', category: 'Learning' }),
      utcEvent({ start: '2026-07-01T10:00:00.000Z', end: '2026-07-01T12:00:00.000Z', category: 'Learning' }),
    ];

    // Act
    const ring = buildRingSegments([day('2026-07-01', events)], COLORS);

    // Assert — 09:00–12:00 merged = 180, not 240
    expect(ring.segments[0].durationMinutes).toBe(180);
  });

  it('collects events without a category into one quiet segment', () => {
    const events = [
      utcEvent({ start: '2026-07-01T09:00:00.000Z', end: '2026-07-01T10:00:00.000Z' }),
    ];
    const ring = buildRingSegments([day('2026-07-01', events)], COLORS);
    expect(ring.segments).toEqual([
      { kind: 'uncategorized', durationMinutes: 60, share: 1 },
    ]);
  });

  it('returns an empty ring for an empty day — never a fake segment', () => {
    const ring = buildRingSegments([day('2026-07-01', [])], COLORS);
    expect(ring.segments).toEqual([]);
    expect(ring.totalMinutes).toBe(0);
  });
});

describe('buildRingSegments — periods (§5.2.4)', () => {
  it('combines all forgotten moments into a single segment across a period', () => {
    // Arrange — a forgotten gap on each of two days
    const monday = day('2026-06-29', [
      utcEvent({ start: '2026-06-29T09:00:00.000Z', end: '2026-06-29T10:00:00.000Z', category: 'Learning' }),
      utcEvent({ start: '2026-06-29T12:00:00.000Z', end: '2026-06-29T13:00:00.000Z', category: 'Learning' }),
    ]);
    const tuesday = day('2026-06-30', [
      utcEvent({ start: '2026-06-30T09:00:00.000Z', end: '2026-06-30T10:00:00.000Z', category: 'Health' }),
      utcEvent({ start: '2026-06-30T13:00:00.000Z', end: '2026-06-30T14:00:00.000Z', category: 'Health' }),
    ]);

    // Act
    const ring = buildRingSegments([monday, tuesday], COLORS);

    // Assert — one forgotten segment carrying both days' slices, summed
    const forgotten = ring.segments.filter((segment) => segment.kind === 'forgotten');
    expect(forgotten).toHaveLength(1);
    if (forgotten[0].kind !== 'forgotten') throw new Error('expected forgotten segment');
    expect(forgotten[0].slices.map((slice) => slice.localDate)).toEqual([
      '2026-06-29',
      '2026-06-30',
    ]);
    expect(forgotten[0].durationMinutes).toBe(120 + 180);
  });

  it('sums a category across days with the same fixed color (§5.2.4)', () => {
    // Arrange — Learning on both days
    const days = [
      day('2026-06-29', [
        utcEvent({ start: '2026-06-29T09:00:00.000Z', end: '2026-06-29T11:00:00.000Z', category: 'Learning' }),
      ]),
      day('2026-06-30', [
        utcEvent({ start: '2026-06-30T09:00:00.000Z', end: '2026-06-30T10:00:00.000Z', category: 'Learning' }),
      ]),
    ];

    // Act
    const ring = buildRingSegments(days, COLORS);

    // Assert
    expect(ring.segments).toHaveLength(1);
    const learning = ring.segments[0];
    if (learning.kind !== 'category') throw new Error('expected a category segment');
    expect(learning.durationMinutes).toBe(180);
    expect(learning.color).toBe(colorForCategoryIndex(0));
  });

  it('clamps cross-midnight memories to each day so a period never double-counts', () => {
    // Arrange — one 23:00–01:00 memory appears in both days' event lists,
    // exactly as listBetween returns it (§ overlap semantics).
    const crossing = utcEvent({
      start: '2026-06-29T23:00:00.000Z',
      end: '2026-06-30T01:00:00.000Z',
      category: 'Family',
    });
    const days = [day('2026-06-29', [crossing]), day('2026-06-30', [crossing])];

    // Act
    const ring = buildRingSegments(days, COLORS);

    // Assert — 120 real minutes, not 240
    expect(ring.segments[0].durationMinutes).toBe(120);
  });
});
