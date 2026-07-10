import { describe, expect, test, vi } from 'vitest';

import { handleCaptureRequest } from '@/app/api/capture/handler';
import type { LifeEventExtractor } from '@/ai/life-event-extractor';
import { InMemoryRateLimiter, type RateLimiter } from '@/data/rate-limiter';

const USER = 'user-1';

/** A limiter that never blocks — for the tests not about rate limiting. */
const allowAll: RateLimiter = {
  hit: async () => ({ allowed: true, count: 1, limit: 50, resetAt: '2026-07-11T00:00:00.000Z' }),
};

const stubResult = {
  candidates: [
    {
      title: 'Gym',
      description: null,
      category: null,
      categoryConfidence: null,
      startLocalTime: '09:00',
      endLocalTime: '10:00',
      timeConfidence: 1,
      people: [],
      place: null,
    },
  ],
  note: null,
};

const workingExtractor: LifeEventExtractor = {
  kind: 'stub',
  extract: async () => stubResult,
};

const validBody = {
  narrative: '09:00-10:00 Gym',
  localDate: '2026-07-02',
  timezone: 'Europe/Istanbul',
};

describe('handleCaptureRequest', () => {
  test('returns candidates and the extractor kind on success', async () => {
    const { status, body } = await handleCaptureRequest(
      validBody,
      workingExtractor,
      allowAll,
      USER,
    );

    expect(status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: { candidates: stubResult.candidates, note: null, extractor: 'stub' },
      error: null,
    });
  });

  test('rejects a missing narrative', async () => {
    const { status, body } = await handleCaptureRequest(
      { ...validBody, narrative: '' },
      workingExtractor,
      allowAll,
      USER,
    );

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBeTruthy();
  });

  test('rejects a malformed localDate', async () => {
    const { status } = await handleCaptureRequest(
      { ...validBody, localDate: '02/07/2026' },
      workingExtractor,
      allowAll,
      USER,
    );

    expect(status).toBe(400);
  });

  test('rejects an invalid IANA timezone', async () => {
    const { status } = await handleCaptureRequest(
      { ...validBody, timezone: 'Mars/Olympus_Mons' },
      workingExtractor,
      allowAll,
      USER,
    );

    expect(status).toBe(400);
  });

  test('rejects a non-object body', async () => {
    const { status } = await handleCaptureRequest(null, workingExtractor, allowAll, USER);

    expect(status).toBe(400);
  });

  test('rejects an oversized narrative (input validated at the boundary)', async () => {
    const { status } = await handleCaptureRequest(
      { ...validBody, narrative: 'x'.repeat(20_001) },
      workingExtractor,
      allowAll,
      USER,
    );

    expect(status).toBe(400);
  });

  test('maps extractor failures to a 502 with a friendly, key-free message', async () => {
    const failing: LifeEventExtractor = {
      kind: 'claude',
      extract: async () => {
        throw new Error('boom sk-ant-secret');
      },
    };

    const { status, body } = await handleCaptureRequest(validBody, failing, allowAll, USER);

    expect(status).toBe(502);
    expect(body.success).toBe(false);
    expect(JSON.stringify(body)).not.toContain('sk-ant');
  });

  test('refuses with 429 once the daily cap is reached, without calling the model', async () => {
    const limiter = new InMemoryRateLimiter(1);
    const extract = vi.fn(async () => stubResult);
    const spied: LifeEventExtractor = { kind: 'stub', extract };

    const first = await handleCaptureRequest(validBody, spied, limiter, USER);
    expect(first.status).toBe(200);

    const second = await handleCaptureRequest(validBody, spied, limiter, USER);
    expect(second.status).toBe(429);
    expect(second.body.success).toBe(false);
    // The model is only called for the allowed capture — the cap saves the cost.
    expect(extract).toHaveBeenCalledTimes(1);
  });

  test('meters each user independently', async () => {
    const limiter = new InMemoryRateLimiter(1);

    expect((await handleCaptureRequest(validBody, workingExtractor, limiter, 'a')).status).toBe(200);
    // 'b' is unaffected by 'a' having spent their slot.
    expect((await handleCaptureRequest(validBody, workingExtractor, limiter, 'b')).status).toBe(200);
    expect((await handleCaptureRequest(validBody, workingExtractor, limiter, 'a')).status).toBe(429);
  });
});
