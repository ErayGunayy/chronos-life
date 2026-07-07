import { describe, expect, test, vi } from 'vitest';

import { ExtractionError } from '@/ai/errors';
import { GeminiExtractor, type GeminiClient } from '@/ai/gemini-extractor';

const request = {
  narrative: 'Sabah dokuz civarı bir buçuk saat Ayşe ile kahve içtim.',
  localDate: '2026-07-02',
  timezone: 'Europe/Istanbul',
};

const output = {
  candidates: [
    {
      title: 'Ayşe ile kahve',
      description: null,
      category: 'Sosyal',
      categoryConfidence: 0.7,
      startLocalTime: '09:00',
      endLocalTime: '10:30',
      timeConfidence: 0.6,
      people: ['Ayşe'],
      place: null,
    },
  ],
  note: null,
};

function fakeClient(generate: ReturnType<typeof vi.fn>): GeminiClient {
  return { generate } as unknown as GeminiClient;
}

function respondWith(value: unknown) {
  return vi.fn().mockResolvedValue({
    candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }],
  });
}

describe('GeminiExtractor (contract, mocked client)', () => {
  test('identifies itself as gemini', () => {
    expect(new GeminiExtractor({ client: fakeClient(vi.fn()) }).kind).toBe('gemini');
  });

  test('sends the narrative, date, timezone, and a JSON response schema', async () => {
    const generate = respondWith(output);
    await new GeminiExtractor({ client: fakeClient(generate) }).extract(request);

    expect(generate).toHaveBeenCalledTimes(1);
    const call = generate.mock.calls[0][0];
    const serialized = JSON.stringify(call.body);
    expect(serialized).toContain('Ayşe ile kahve');
    expect(serialized).toContain('2026-07-02');
    expect(serialized).toContain('Europe/Istanbul');
    expect(call.body.generationConfig).toMatchObject({
      temperature: 0,
      responseMimeType: 'application/json',
    });
    expect(call.body.generationConfig.responseSchema).toBeTypeOf('object');
  });

  test('uses the configured model, defaulting to gemini-2.0-flash', async () => {
    const generate = respondWith(output);
    await new GeminiExtractor({ client: fakeClient(generate) }).extract(request);
    expect(generate.mock.calls[0][0].model).toBe('gemini-2.0-flash');

    await new GeminiExtractor({ client: fakeClient(generate), model: 'gemini-2.5-flash' }).extract(
      request,
    );
    expect(generate.mock.calls[1][0].model).toBe('gemini-2.5-flash');
  });

  test('encodes the no-invention guardrail and keeps the narrator’s language', async () => {
    const generate = respondWith(output);
    await new GeminiExtractor({ client: fakeClient(generate) }).extract(request);

    const system = String(
      generate.mock.calls[0][0].body.systemInstruction.parts[0].text,
    ).toLowerCase();
    expect(system).toContain('never invent');
    expect(system).toContain('same language');
    for (const banned of ['wasted', 'failed', 'lazy', 'disappointing']) {
      expect(system).toContain(banned);
    }
  });

  test('returns candidates sorted by start time', async () => {
    const generate = respondWith({
      candidates: [
        { ...output.candidates[0], title: 'Sonra', startLocalTime: '14:00', endLocalTime: '15:00' },
        { ...output.candidates[0], title: 'Önce', startLocalTime: '08:00', endLocalTime: '09:00' },
      ],
      note: null,
    });

    const result = await new GeminiExtractor({ client: fakeClient(generate) }).extract(request);

    expect(result.candidates.map((candidate) => candidate.title)).toEqual(['Önce', 'Sonra']);
  });

  test('an empty response becomes a typed ExtractionError, not a crash', async () => {
    const generate = vi.fn().mockResolvedValue({ candidates: [{ content: { parts: [{ text: '' }] } }] });

    await expect(
      new GeminiExtractor({ client: fakeClient(generate) }).extract(request),
    ).rejects.toBeInstanceOf(ExtractionError);
  });

  test('non-JSON content becomes a typed ExtractionError', async () => {
    const generate = vi
      .fn()
      .mockResolvedValue({ candidates: [{ content: { parts: [{ text: 'not json at all' }] } }] });

    await expect(
      new GeminiExtractor({ client: fakeClient(generate) }).extract(request),
    ).rejects.toBeInstanceOf(ExtractionError);
  });

  test('schema-violating output becomes a typed ExtractionError', async () => {
    const generate = respondWith({ candidates: [{ title: 'missing everything else' }], note: null });

    await expect(
      new GeminiExtractor({ client: fakeClient(generate) }).extract(request),
    ).rejects.toBeInstanceOf(ExtractionError);
  });

  test('a transport failure surfaces as ExtractionError', async () => {
    const generate = vi.fn().mockRejectedValue(new Error('gemini generateContent 429: rate limited'));

    await expect(
      new GeminiExtractor({ client: fakeClient(generate) }).extract(request),
    ).rejects.toBeInstanceOf(ExtractionError);
  });
});
