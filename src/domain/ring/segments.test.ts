import { describe, expect, it } from 'vitest';

import { createLifeEvent } from '@/domain/life-event/factory';
import type { LifeEvent, LifeEventKind } from '@/domain/life-event/types';
import { colorForCategoryIndex } from '@/domain/ring/palette';
import {
  buildDayClock,
  buildRingSegments,
  type RingDayInput,
  type RingSegment,
} from '@/domain/ring/segments';

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

/** Every clock band should tile [0,1] exactly — no gaps, no overlaps. */
function assertTiles(segments: readonly RingSegment[]): void {
  expect(segments[0].startFraction).toBeCloseTo(0, 10);
  expect(segments[segments.length - 1].endFraction).toBeCloseTo(1, 10);
  for (let i = 1; i < segments.length; i += 1) {
    expect(segments[i].startFraction).toBeCloseTo(segments[i - 1].endFraction ?? -1, 10);
  }
}

describe('buildDayClock — the single-day 24h clock (§5.2)', () => {
  it('places every event and gap at its real position, in chronological order', () => {
    // Arrange — 09:00–11:00 Learning, 30m routine pause, 11:30–12:30 Health,
    // 90m forgotten gap, 14:00–15:00 Family, 15:00–16:00 unremembered.
    const events = [
      utcEvent({ start: '2026-07-01T09:00:00.000Z', end: '2026-07-01T11:00:00.000Z', category: 'Learning' }),
      utcEvent({ start: '2026-07-01T11:30:00.000Z', end: '2026-07-01T12:30:00.000Z', category: 'Health' }),
      utcEvent({ start: '2026-07-01T14:00:00.000Z', end: '2026-07-01T15:00:00.000Z', category: 'Family' }),
      utcEvent({ start: '2026-07-01T15:00:00.000Z', end: '2026-07-01T16:00:00.000Z', kind: 'unremembered' }),
    ];

    // Act
    const ring = buildDayClock(day('2026-07-01', events), COLORS);

    // Assert — clock order is chronological, NOT largest-first: the night leads
    // only because 00:00 comes first, then the day plays out hour by hour.
    expect(ring.layout).toBe('clock');
    expect(ring.segments.map((segment) => [segment.kind, segment.durationMinutes])).toEqual([
      ['unaccounted', 540], // 00:00–09:00
      ['category', 120], //    09:00–11:00 Learning
      ['routine-gap', 30], //  11:00–11:30
      ['category', 60], //     11:30–12:30 Health
      ['forgotten', 90], //    12:30–14:00
      ['category', 60], //     14:00–15:00 Family
      ['unremembered', 60], // 15:00–16:00
      ['unaccounted', 480], // 16:00–24:00
    ]);
    expect(ring.totalMinutes).toBe(1440);

    // Midnight sits at the top (fraction 0) and the day tiles the full circle.
    assertTiles(ring.segments);
    const learning = ring.segments[1];
    if (learning.kind !== 'category') throw new Error('expected a category segment');
    expect(learning.category).toBe('Learning');
    expect(learning.color).toBe(colorForCategoryIndex(0));
    expect(learning.startFraction).toBeCloseTo(9 / 24, 10); // 09:00
    expect(learning.endFraction).toBeCloseTo(11 / 24, 10); // 11:00
  });

  it('renders each forgotten moment as its own tappable band (§5.2.2)', () => {
    // Arrange — two separate ≥1h gaps
    const events = [
      utcEvent({ start: '2026-07-01T08:00:00.000Z', end: '2026-07-01T09:00:00.000Z', category: 'Learning' }),
      utcEvent({ start: '2026-07-01T10:30:00.000Z', end: '2026-07-01T11:00:00.000Z', category: 'Learning' }),
      utcEvent({ start: '2026-07-01T13:00:00.000Z', end: '2026-07-01T14:00:00.000Z', category: 'Learning' }),
    ];

    // Act
    const ring = buildDayClock(day('2026-07-01', events), COLORS);

    // Assert — two breathing arcs, each one gap, at its own place on the clock.
    const forgotten = ring.segments.filter((segment) => segment.kind === 'forgotten');
    expect(forgotten).toHaveLength(2);
    for (const segment of forgotten) {
      if (segment.kind !== 'forgotten') continue;
      expect(segment.slices).toHaveLength(1);
    }
    assertTiles(ring.segments);
  });

  it('clips overlapping same-category blocks — never double-counts, never overlaps', () => {
    // Arrange — two Learning blocks overlapping 10:00–11:00
    const events = [
      utcEvent({ start: '2026-07-01T09:00:00.000Z', end: '2026-07-01T11:00:00.000Z', category: 'Learning' }),
      utcEvent({ start: '2026-07-01T10:00:00.000Z', end: '2026-07-01T12:00:00.000Z', category: 'Learning' }),
    ];

    // Act
    const ring = buildDayClock(day('2026-07-01', events), COLORS);

    // Assert — 09:00–12:00 covered once (180 min total) as touching bands, not 240.
    const categories = ring.segments.filter((segment) => segment.kind === 'category');
    const learningMinutes = categories.reduce((sum, segment) => sum + segment.durationMinutes, 0);
    expect(learningMinutes).toBe(180);
    assertTiles(ring.segments);
  });

  it('shows an uncategorized event as its own titled band, with the day around it', () => {
    const event = utcEvent({ start: '2026-07-01T09:00:00.000Z', end: '2026-07-01T10:00:00.000Z' });
    const ring = buildDayClock(day('2026-07-01', [event]), COLORS);

    // Leading night 00:00–09:00, the event 09:00–10:00, trailing 10:00–24:00.
    expect(ring.segments.map((segment) => segment.kind)).toEqual([
      'unaccounted',
      'uncategorized',
      'unaccounted',
    ]);
    const uncategorized = ring.segments[1];
    if (uncategorized.kind !== 'uncategorized') throw new Error('expected an uncategorized segment');
    expect(uncategorized.title).toBe(event.title);
    expect(uncategorized.durationMinutes).toBe(60);
    expect(ring.totalMinutes).toBe(1440);
    assertTiles(ring.segments);
  });

  it('keeps each uncategorized event separate — never one anonymous blob', () => {
    const events = [
      utcEvent({ start: '2026-07-01T09:00:00.000Z', end: '2026-07-01T10:00:00.000Z' }),
      utcEvent({ start: '2026-07-01T14:00:00.000Z', end: '2026-07-01T15:00:00.000Z' }),
    ];
    const ring = buildDayClock(day('2026-07-01', events), COLORS);

    const uncategorized = ring.segments.filter((segment) => segment.kind === 'uncategorized');
    expect(uncategorized).toHaveLength(2);
    expect(uncategorized.map((segment) => segment.durationMinutes)).toEqual([60, 60]);
  });

  it('returns an empty ring for an empty day — never a fake segment', () => {
    const ring = buildDayClock(day('2026-07-01', []), COLORS);
    expect(ring.segments).toEqual([]);
    expect(ring.totalMinutes).toBe(0);
    expect(ring.layout).toBe('clock');
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

  it('omits the unaccounted remainder on multi-day periods (§5.2.4)', () => {
    // Arrange — a sparse two-day window that would leave a huge remainder.
    const days = [
      day('2026-06-29', [
        utcEvent({ start: '2026-06-29T09:00:00.000Z', end: '2026-06-29T10:00:00.000Z', category: 'Learning' }),
      ]),
      day('2026-06-30', [
        utcEvent({ start: '2026-06-30T09:00:00.000Z', end: '2026-06-30T10:00:00.000Z', category: 'Learning' }),
      ]),
    ];

    // Act
    const ring = buildRingSegments(days, COLORS);

    // Assert — no giant "Yet to tell" wedge across the period.
    expect(ring.segments.some((segment) => segment.kind === 'unaccounted')).toBe(false);
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
    const categories = ring.segments.filter((segment) => segment.kind === 'category');
    expect(categories).toHaveLength(1);
    const learning = categories[0];
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
    const family = ring.segments.find((segment) => segment.kind === 'category');
    expect(family?.durationMinutes).toBe(120);
  });
});
