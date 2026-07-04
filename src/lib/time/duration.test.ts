import { describe, expect, it } from 'vitest';

import { formatMinutes } from '@/lib/time/duration';

describe('formatMinutes', () => {
  it('formats minutes, hours, and mixed durations', () => {
    expect(formatMinutes(0)).toBe('0m');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(150)).toBe('2h 30m');
  });

  it('rounds fractional minutes and never goes negative', () => {
    expect(formatMinutes(89.6)).toBe('1h 30m');
    expect(formatMinutes(-5)).toBe('0m');
  });
});
