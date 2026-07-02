import { describe, expect, test } from 'vitest';

import { hourOfDayBucket } from '@/lib/time/hour-bucket';

describe('hourOfDayBucket', () => {
  test('returns the local hour of day (patterns are keyed by hour range, §6.6)', () => {
    // 22:30Z = 01:30 in Istanbul
    expect(hourOfDayBucket('2026-07-01T22:30:00.000Z', 'Europe/Istanbul')).toBe(1);
  });

  test('UTC passthrough', () => {
    expect(hourOfDayBucket('2026-07-02T15:05:00.000Z', 'UTC')).toBe(15);
  });

  test('handles DST offsets (New York in July is UTC-4)', () => {
    // 00:30Z = 20:30 the previous evening in New York
    expect(hourOfDayBucket('2026-07-02T00:30:00.000Z', 'America/New_York')).toBe(20);
  });

  test('midnight is bucket 0', () => {
    expect(hourOfDayBucket('2026-07-02T00:00:00.000Z', 'UTC')).toBe(0);
  });
});
