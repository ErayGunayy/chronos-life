import { describe, expect, test } from 'vitest';

import {
  InMemoryRateLimiter,
  dailyCaptureLimit,
  nextUtcMidnight,
  utcDay,
} from '@/data/rate-limiter';

describe('InMemoryRateLimiter', () => {
  test('allows uses up to the limit, then blocks', async () => {
    const limiter = new InMemoryRateLimiter(3);

    expect((await limiter.hit('u')).allowed).toBe(true); // 1
    expect((await limiter.hit('u')).allowed).toBe(true); // 2
    const third = await limiter.hit('u'); // 3
    expect(third).toMatchObject({ allowed: true, count: 3, limit: 3 });

    const fourth = await limiter.hit('u'); // 4 — over
    expect(fourth).toMatchObject({ allowed: false, count: 4, limit: 3 });
  });

  test('counts each user separately', async () => {
    const limiter = new InMemoryRateLimiter(1);

    expect((await limiter.hit('a')).allowed).toBe(true);
    expect((await limiter.hit('b')).allowed).toBe(true);
    expect((await limiter.hit('a')).allowed).toBe(false);
  });

  test('reports the reset instant as the next UTC midnight', async () => {
    const { resetAt } = await new InMemoryRateLimiter(1).hit('u');
    expect(resetAt).toBe(nextUtcMidnight());
    expect(resetAt.endsWith('T00:00:00.000Z')).toBe(true);
  });
});

describe('dailyCaptureLimit', () => {
  test('defaults to 50 when unset or invalid', () => {
    const original = process.env.CHRONOS_DAILY_CAPTURE_LIMIT;
    try {
      delete process.env.CHRONOS_DAILY_CAPTURE_LIMIT;
      expect(dailyCaptureLimit()).toBe(50);

      process.env.CHRONOS_DAILY_CAPTURE_LIMIT = 'not-a-number';
      expect(dailyCaptureLimit()).toBe(50);

      process.env.CHRONOS_DAILY_CAPTURE_LIMIT = '0';
      expect(dailyCaptureLimit()).toBe(50);
    } finally {
      if (original === undefined) delete process.env.CHRONOS_DAILY_CAPTURE_LIMIT;
      else process.env.CHRONOS_DAILY_CAPTURE_LIMIT = original;
    }
  });

  test('honors a positive integer override', () => {
    const original = process.env.CHRONOS_DAILY_CAPTURE_LIMIT;
    try {
      process.env.CHRONOS_DAILY_CAPTURE_LIMIT = '120';
      expect(dailyCaptureLimit()).toBe(120);
    } finally {
      if (original === undefined) delete process.env.CHRONOS_DAILY_CAPTURE_LIMIT;
      else process.env.CHRONOS_DAILY_CAPTURE_LIMIT = original;
    }
  });
});

describe('utcDay', () => {
  test('formats the UTC calendar day as YYYY-MM-DD', () => {
    expect(utcDay(new Date('2026-07-10T23:30:00.000Z'))).toBe('2026-07-10');
    expect(utcDay(new Date('2026-07-10T00:00:00.000Z'))).toBe('2026-07-10');
  });
});
