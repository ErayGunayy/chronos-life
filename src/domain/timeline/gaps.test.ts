import { describe, expect, test } from 'vitest';

import { createLifeEvent } from '@/domain/life-event/factory';
import type { LifeEvent } from '@/domain/life-event/types';
import {
  FORGOTTEN_MOMENT_THRESHOLD_MINUTES,
  buildDayTimeline,
  detectGaps,
  rememberedShare,
} from '@/domain/timeline/gaps';

let counter = 0;

function makeEvent(
  startAt: string,
  endAt: string,
  overrides: Partial<Parameters<typeof createLifeEvent>[0]> = {},
): LifeEvent {
  counter += 1;
  return createLifeEvent(
    {
      userId: 'user-1',
      title: `Memory ${counter}`,
      startAt,
      endAt,
      timezone: 'Europe/Istanbul',
      source: 'life-conversation',
      ...overrides,
    },
    { id: () => `event-${counter}`, now: () => '2026-07-02T19:00:00.000Z' },
  );
}

describe('detectGaps', () => {
  test('threshold constant matches the spec (§6.3: one hour)', () => {
    expect(FORGOTTEN_MOMENT_THRESHOLD_MINUTES).toBe(60);
  });

  test('no events → no gaps (never flags an empty day)', () => {
    expect(detectGaps([])).toEqual([]);
  });

  test('a single event → no gaps (nothing before the first or after the last, §8)', () => {
    const event = makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T07:00:00.000Z');

    expect(detectGaps([event])).toEqual([]);
  });

  test('a 30-minute gap is routine', () => {
    const gaps = detectGaps([
      makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T07:00:00.000Z'),
      makeEvent('2026-07-02T07:30:00.000Z', '2026-07-02T08:30:00.000Z'),
    ]);

    expect(gaps).toEqual([
      {
        startAt: '2026-07-02T07:00:00.000Z',
        endAt: '2026-07-02T07:30:00.000Z',
        durationMinutes: 30,
        kind: 'routine',
      },
    ]);
  });

  test('exactly 60 minutes is a Forgotten Moment (spec says "1 hour or more")', () => {
    const gaps = detectGaps([
      makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T07:00:00.000Z'),
      makeEvent('2026-07-02T08:00:00.000Z', '2026-07-02T09:00:00.000Z'),
    ]);

    expect(gaps).toHaveLength(1);
    expect(gaps[0].kind).toBe('forgotten-moment');
    expect(gaps[0].durationMinutes).toBe(60);
  });

  test('59 minutes stays routine', () => {
    const gaps = detectGaps([
      makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T07:00:00.000Z'),
      makeEvent('2026-07-02T07:59:00.000Z', '2026-07-02T09:00:00.000Z'),
    ]);

    expect(gaps[0].kind).toBe('routine');
  });

  test('touching events produce no gap', () => {
    const gaps = detectGaps([
      makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T07:00:00.000Z'),
      makeEvent('2026-07-02T07:00:00.000Z', '2026-07-02T08:00:00.000Z'),
    ]);

    expect(gaps).toEqual([]);
  });

  test('overlapping events produce no gap', () => {
    const gaps = detectGaps([
      makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T08:00:00.000Z'),
      makeEvent('2026-07-02T07:00:00.000Z', '2026-07-02T09:00:00.000Z'),
    ]);

    expect(gaps).toEqual([]);
  });

  test('an event contained inside another does not reopen earlier time', () => {
    // A covers 10:00–14:00; B sits inside it; the real gap starts at A's end.
    const gaps = detectGaps([
      makeEvent('2026-07-02T10:00:00.000Z', '2026-07-02T14:00:00.000Z'),
      makeEvent('2026-07-02T11:00:00.000Z', '2026-07-02T12:00:00.000Z'),
      makeEvent('2026-07-02T15:00:00.000Z', '2026-07-02T16:00:00.000Z'),
    ]);

    expect(gaps).toEqual([
      {
        startAt: '2026-07-02T14:00:00.000Z',
        endAt: '2026-07-02T15:00:00.000Z',
        durationMinutes: 60,
        kind: 'forgotten-moment',
      },
    ]);
  });

  test('accepts unsorted input', () => {
    const gaps = detectGaps([
      makeEvent('2026-07-02T08:00:00.000Z', '2026-07-02T09:00:00.000Z'),
      makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T06:30:00.000Z'),
    ]);

    expect(gaps).toHaveLength(1);
    expect(gaps[0].startAt).toBe('2026-07-02T06:30:00.000Z');
  });

  test('an unremembered record covers its time — the gap is answered, not open', () => {
    const gaps = detectGaps([
      makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T07:00:00.000Z'),
      makeEvent('2026-07-02T07:00:00.000Z', '2026-07-02T09:00:00.000Z', {
        kind: 'unremembered',
        title: undefined,
        source: 'gap-fill',
      }),
      makeEvent('2026-07-02T09:00:00.000Z', '2026-07-02T10:00:00.000Z'),
    ]);

    expect(gaps).toEqual([]);
  });

  test('multiple gaps come back in chronological order', () => {
    const gaps = detectGaps([
      makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T07:00:00.000Z'),
      makeEvent('2026-07-02T09:00:00.000Z', '2026-07-02T10:00:00.000Z'),
      makeEvent('2026-07-02T10:30:00.000Z', '2026-07-02T11:00:00.000Z'),
      makeEvent('2026-07-02T14:00:00.000Z', '2026-07-02T15:00:00.000Z'),
    ]);

    expect(gaps.map((g) => [g.startAt, g.kind])).toEqual([
      ['2026-07-02T07:00:00.000Z', 'forgotten-moment'],
      ['2026-07-02T10:00:00.000Z', 'routine'],
      ['2026-07-02T11:00:00.000Z', 'forgotten-moment'],
    ]);
  });
});

describe('buildDayTimeline', () => {
  test('interleaves events and gaps chronologically', () => {
    const a = makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T07:00:00.000Z');
    const b = makeEvent('2026-07-02T08:30:00.000Z', '2026-07-02T09:00:00.000Z');

    const segments = buildDayTimeline([b, a]);

    expect(
      segments.map((s) => (s.type === 'event' ? `event:${s.event.id}` : `gap:${s.gap.kind}`)),
    ).toEqual([`event:${a.id}`, 'gap:forgotten-moment', `event:${b.id}`]);
  });

  test('an empty day is an empty timeline', () => {
    expect(buildDayTimeline([])).toEqual([]);
  });
});

describe('rememberedShare', () => {
  test('null when the day has no events yet (nothing to measure, no judgment)', () => {
    expect(rememberedShare([])).toBeNull();
  });

  test('full coverage → 1', () => {
    const share = rememberedShare([
      makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T08:00:00.000Z'),
    ]);

    expect(share).toBe(1);
  });

  test('partially covered story span → covered minutes over span minutes', () => {
    const share = rememberedShare([
      makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T07:00:00.000Z'),
      makeEvent('2026-07-02T07:30:00.000Z', '2026-07-02T08:00:00.000Z'),
    ]);

    // Span 06:00–08:00 = 120min; covered 60 + 30 = 90 → 0.75
    expect(share).toBe(0.75);
  });

  test('overlapping events are not double-counted', () => {
    const share = rememberedShare([
      makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T07:00:00.000Z'),
      makeEvent('2026-07-02T06:30:00.000Z', '2026-07-02T07:00:00.000Z'),
      makeEvent('2026-07-02T07:00:00.000Z', '2026-07-02T08:00:00.000Z'),
    ]);

    expect(share).toBe(1);
  });

  test('unremembered time extends the story span but does not count as remembered', () => {
    const share = rememberedShare([
      makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T07:00:00.000Z'),
      makeEvent('2026-07-02T07:00:00.000Z', '2026-07-02T08:00:00.000Z', {
        kind: 'unremembered',
        title: undefined,
        source: 'gap-fill',
      }),
    ]);

    // Span 06:00–08:00; only the first hour is a remembered memory.
    expect(share).toBe(0.5);
  });
});
