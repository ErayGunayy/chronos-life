import { describe, expect, test } from 'vitest';

import { localDateOf, localTimeOf } from '@/lib/time/format';

describe('localDateOf', () => {
  test('converts a UTC instant to the local calendar date', () => {
    // 22:30 UTC on 1 July = 01:30 on 2 July in Istanbul (UTC+3)
    expect(localDateOf('2026-07-01T22:30:00.000Z', 'Europe/Istanbul')).toBe('2026-07-02');
  });

  test('passes through for UTC', () => {
    expect(localDateOf('2026-07-01T22:30:00.000Z', 'UTC')).toBe('2026-07-01');
  });

  test('handles DST offsets (New York in July is UTC-4)', () => {
    expect(localDateOf('2026-07-02T00:30:00.000Z', 'America/New_York')).toBe('2026-07-01');
  });

  test('throws on an invalid timezone', () => {
    expect(() => localDateOf('2026-07-01T22:30:00.000Z', 'Mars/Olympus_Mons')).toThrowError();
  });
});

describe('localTimeOf', () => {
  test('formats the local wall-clock time as HH:MM', () => {
    expect(localTimeOf('2026-07-01T22:30:00.000Z', 'Europe/Istanbul')).toBe('01:30');
  });

  test('uses a 24-hour clock, zero-padded', () => {
    expect(localTimeOf('2026-07-02T00:05:00.000Z', 'UTC')).toBe('00:05');
  });

  test('handles DST offsets (New York in July is UTC-4)', () => {
    expect(localTimeOf('2026-07-02T00:30:00.000Z', 'America/New_York')).toBe('20:30');
  });
});
