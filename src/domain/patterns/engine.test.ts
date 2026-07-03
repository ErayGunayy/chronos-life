import { describe, expect, test } from 'vitest';

import { createLifeEvent } from '@/domain/life-event/factory';
import {
  MONTHLY_PROMOTION_MIN_WEEKS,
  WEEKLY_PATTERN_MIN_DAYS,
  YEARLY_PROMOTION_MIN_MONTHS,
  bucketRangeLabel,
  monthlyPatterns,
  summarizeDayGaps,
  weeklyPatterns,
  yearlyPatterns,
} from '@/domain/patterns/engine';

const TZ = 'Europe/Istanbul';

let counter = 0;

function makeEvent(startAt: string, endAt: string, overrides = {}) {
  counter += 1;
  return createLifeEvent(
    {
      userId: 'user-1',
      title: `Memory ${counter}`,
      startAt,
      endAt,
      timezone: TZ,
      source: 'life-conversation',
      ...overrides,
    },
    { id: () => `event-${counter}`, now: () => '2026-07-02T19:00:00.000Z' },
  );
}

function summary(localDate: string, buckets: number[]) {
  return { localDate, forgottenHourBuckets: new Set(buckets) };
}

describe('summarizeDayGaps', () => {
  test('collects the local hour buckets a Forgotten Moment touches (§6.6)', () => {
    // 10:00Z–12:00Z = 13:00–15:00 local → buckets 13 and 14
    const events = [
      makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T10:00:00.000Z'),
      makeEvent('2026-07-02T12:00:00.000Z', '2026-07-02T13:00:00.000Z'),
    ];

    const day = summarizeDayGaps('2026-07-02', events, TZ);

    expect([...day.forgottenHourBuckets].sort((a, b) => a - b)).toEqual([13, 14]);
  });

  test('unremembered records count as forgotten time for patterns (§8)', () => {
    const events = [
      makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T07:00:00.000Z'),
      makeEvent('2026-07-02T17:00:00.000Z', '2026-07-02T18:30:00.000Z', {
        kind: 'unremembered',
        title: undefined,
        source: 'gap-fill',
      }),
    ];

    const day = summarizeDayGaps('2026-07-02', events, TZ);

    // 17:00Z–18:30Z = 20:00–21:30 local → buckets 20 and 21
    expect(day.forgottenHourBuckets.has(20)).toBe(true);
    expect(day.forgottenHourBuckets.has(21)).toBe(true);
  });

  test('routine gaps contribute nothing', () => {
    const events = [
      makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T07:00:00.000Z'),
      makeEvent('2026-07-02T07:30:00.000Z', '2026-07-02T08:00:00.000Z'),
    ];

    expect(summarizeDayGaps('2026-07-02', events, TZ).forgottenHourBuckets.size).toBe(0);
  });
});

describe('weeklyPatterns (§6.6: ≥50%, never before 7 days of data)', () => {
  test('the guard constant matches the spec', () => {
    expect(WEEKLY_PATTERN_MIN_DAYS).toBe(7);
  });

  test('under 7 days of data → no patterns, no matter how strong the signal', () => {
    const days = Array.from({ length: 6 }, (_, i) => summary(`2026-07-0${i + 1}`, [15]));

    expect(weeklyPatterns(days)).toEqual([]);
  });

  test('a bucket forgotten on at least half the days with data becomes a pattern', () => {
    const days = [
      summary('2026-07-01', [15]),
      summary('2026-07-02', [15, 9]),
      summary('2026-07-03', []),
      summary('2026-07-04', [15]),
      summary('2026-07-05', [9]),
      summary('2026-07-06', [15]),
      summary('2026-07-07', []),
      summary('2026-07-08', []),
    ];

    const patterns = weeklyPatterns(days);

    expect(patterns).toEqual([{ bucket: 15, share: 0.5, daysWithData: 8 }]);
  });

  test('patterns sort by share, strongest first', () => {
    const days = Array.from({ length: 8 }, (_, i) =>
      summary(`2026-07-0${i + 1}`, i < 6 ? [21, 15] : i < 4 ? [15] : [15]),
    );

    const patterns = weeklyPatterns(days);

    expect(patterns.map((p) => p.bucket)).toEqual([15, 21]);
    expect(patterns[0].share).toBeGreaterThanOrEqual(patterns[1].share);
  });
});

describe('monthly and yearly promotion (§6.6: stricter evidence for bigger claims)', () => {
  const weeks = (sets: number[][]) => sets.map((buckets) => new Set(buckets));

  test('monthly needs 4 completed weekly cycles', () => {
    expect(MONTHLY_PROMOTION_MIN_WEEKS).toBe(4);
    expect(monthlyPatterns(weeks([[15], [15], [15]]))).toEqual([]);
  });

  test('a bucket recurring in 3 of the last 4 weeks is promoted (≥75%)', () => {
    const patterns = monthlyPatterns(weeks([[15, 9], [15], [8], [15]]));

    expect(patterns).toEqual([{ bucket: 15, share: 0.75 }]);
  });

  test('only the last 4 weeks count', () => {
    // Bucket 9 appears in 3 old weeks but only once in the last 4.
    const patterns = monthlyPatterns(weeks([[9], [9], [9], [15], [15], [9, 15], [15]]));

    expect(patterns).toEqual([{ bucket: 15, share: 1 }]);
  });

  test('yearly needs 12 monthly cycles and ≥75% (9 of 12)', () => {
    expect(YEARLY_PROMOTION_MIN_MONTHS).toBe(12);

    const eleven = weeks(Array.from({ length: 11 }, () => [15]));
    expect(yearlyPatterns(eleven)).toEqual([]);

    const twelve = weeks(
      Array.from({ length: 12 }, (_, i) => (i < 9 ? [15] : [])),
    );
    expect(yearlyPatterns(twelve)).toEqual([{ bucket: 15, share: 0.75 }]);

    const eight = weeks(Array.from({ length: 12 }, (_, i) => (i < 8 ? [15] : [])));
    expect(yearlyPatterns(eight)).toEqual([]);
  });
});

describe('bucketRangeLabel', () => {
  test('labels the hour range of the day', () => {
    expect(bucketRangeLabel(15)).toBe('15:00–16:00');
    expect(bucketRangeLabel(0)).toBe('00:00–01:00');
    expect(bucketRangeLabel(23)).toBe('23:00–00:00');
  });
});
