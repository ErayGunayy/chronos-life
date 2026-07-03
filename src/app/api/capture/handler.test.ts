import { describe, expect, test } from 'vitest';

import { handleCaptureRequest } from '@/app/api/capture/handler';
import type { LifeEventExtractor } from '@/ai/life-event-extractor';

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
    const { status, body } = await handleCaptureRequest(validBody, workingExtractor);

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
    );

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBeTruthy();
  });

  test('rejects a malformed localDate', async () => {
    const { status } = await handleCaptureRequest(
      { ...validBody, localDate: '02/07/2026' },
      workingExtractor,
    );

    expect(status).toBe(400);
  });

  test('rejects an invalid IANA timezone', async () => {
    const { status } = await handleCaptureRequest(
      { ...validBody, timezone: 'Mars/Olympus_Mons' },
      workingExtractor,
    );

    expect(status).toBe(400);
  });

  test('rejects a non-object body', async () => {
    const { status } = await handleCaptureRequest(null, workingExtractor);

    expect(status).toBe(400);
  });

  test('rejects an oversized narrative (input validated at the boundary)', async () => {
    const { status } = await handleCaptureRequest(
      { ...validBody, narrative: 'x'.repeat(20_001) },
      workingExtractor,
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

    const { status, body } = await handleCaptureRequest(validBody, failing);

    expect(status).toBe(502);
    expect(body.success).toBe(false);
    expect(JSON.stringify(body)).not.toContain('sk-ant');
  });
});
