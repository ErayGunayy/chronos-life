import { describe, expect, test } from 'vitest';

import { dayBoundsUtc } from '@/lib/time/day-bounds';

describe('dayBoundsUtc', () => {
  test('Istanbul (UTC+3, no DST): local day maps to 21:00Z the evening before', () => {
    expect(dayBoundsUtc('2026-07-02', 'Europe/Istanbul')).toEqual({
      fromUtc: '2026-07-01T21:00:00.000Z',
      toUtc: '2026-07-02T21:00:00.000Z',
    });
  });

  test('UTC: local day equals the UTC day', () => {
    expect(dayBoundsUtc('2026-07-02', 'UTC')).toEqual({
      fromUtc: '2026-07-02T00:00:00.000Z',
      toUtc: '2026-07-03T00:00:00.000Z',
    });
  });

  test('New York in July (EDT, UTC-4): midnight local is 04:00Z', () => {
    expect(dayBoundsUtc('2026-07-02', 'America/New_York')).toEqual({
      fromUtc: '2026-07-02T04:00:00.000Z',
      toUtc: '2026-07-03T04:00:00.000Z',
    });
  });

  test('DST spring-forward day is 23 hours long (New York, 2026-03-08)', () => {
    // Midnight starts in EST (UTC-5); the next midnight is in EDT (UTC-4).
    expect(dayBoundsUtc('2026-03-08', 'America/New_York')).toEqual({
      fromUtc: '2026-03-08T05:00:00.000Z',
      toUtc: '2026-03-09T04:00:00.000Z',
    });
  });

  test('DST fall-back day is 25 hours long (New York, 2026-11-01)', () => {
    expect(dayBoundsUtc('2026-11-01', 'America/New_York')).toEqual({
      fromUtc: '2026-11-01T04:00:00.000Z',
      toUtc: '2026-11-02T05:00:00.000Z',
    });
  });

  test('throws on an invalid timezone', () => {
    expect(() => dayBoundsUtc('2026-07-02', 'Mars/Olympus_Mons')).toThrowError();
  });

  test('throws on a malformed local date', () => {
    expect(() => dayBoundsUtc('02/07/2026', 'UTC')).toThrowError();
  });
});
