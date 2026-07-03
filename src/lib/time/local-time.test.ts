import { describe, expect, test } from 'vitest';

import { nextLocalDate, utcInstantAtLocalTime } from '@/lib/time/day-bounds';

describe('utcInstantAtLocalTime', () => {
  test('converts a wall-clock HH:MM to the UTC instant', () => {
    expect(utcInstantAtLocalTime('2026-07-02', '09:00', 'Europe/Istanbul')).toBe(
      '2026-07-02T06:00:00.000Z',
    );
  });

  test('UTC passthrough', () => {
    expect(utcInstantAtLocalTime('2026-07-02', '23:45', 'UTC')).toBe('2026-07-02T23:45:00.000Z');
  });

  test('resolves times after a spring-forward transition in the new offset', () => {
    // 04:00 on the 23-hour day is EDT (UTC-4)
    expect(utcInstantAtLocalTime('2026-03-08', '04:00', 'America/New_York')).toBe(
      '2026-03-08T08:00:00.000Z',
    );
  });

  test('rejects malformed times', () => {
    expect(() => utcInstantAtLocalTime('2026-07-02', '9am', 'UTC')).toThrowError();
    expect(() => utcInstantAtLocalTime('2026-07-02', '25:00', 'UTC')).toThrowError();
  });
});

describe('nextLocalDate', () => {
  test('increments within a month', () => {
    expect(nextLocalDate('2026-07-02')).toBe('2026-07-03');
  });

  test('rolls over month and year boundaries', () => {
    expect(nextLocalDate('2026-07-31')).toBe('2026-08-01');
    expect(nextLocalDate('2026-12-31')).toBe('2027-01-01');
  });
});
