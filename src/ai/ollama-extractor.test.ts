import { describe, expect, test, vi } from 'vitest';

import { ExtractionError } from '@/ai/errors';
import { OllamaExtractor, type OllamaClient } from '@/ai/ollama-extractor';

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

function fakeClient(chat: ReturnType<typeof vi.fn>): OllamaClient {
  return { chat } as unknown as OllamaClient;
}

function respondWith(value: unknown) {
  return vi.fn().mockResolvedValue({ message: { content: JSON.stringify(value) } });
}

describe('OllamaExtractor (contract, mocked client)', () => {
  test('identifies itself as ollama', () => {
    expect(new OllamaExtractor({ client: fakeClient(vi.fn()) }).kind).toBe('ollama');
  });

  test('sends the narrative, date, timezone, and a JSON-schema format', async () => {
    const chat = respondWith(output);
    await new OllamaExtractor({ client: fakeClient(chat) }).extract(request);

    expect(chat).toHaveBeenCalledTimes(1);
    const call = chat.mock.calls[0][0];
    const serialized = JSON.stringify(call);
    expect(serialized).toContain('Ayşe ile kahve');
    expect(serialized).toContain('2026-07-02');
    expect(serialized).toContain('Europe/Istanbul');
    // Structured output is constrained by a schema, and sampling is deterministic.
    expect(call.format).toBeTypeOf('object');
    expect(call.options).toMatchObject({ temperature: 0 });
    expect(call.stream).toBe(false);
  });

  test('uses the configured model, defaulting to qwen2.5:14b', async () => {
    const chat = respondWith(output);
    await new OllamaExtractor({ client: fakeClient(chat) }).extract(request);
    expect(chat.mock.calls[0][0].model).toBe('qwen2.5:14b');

    await new OllamaExtractor({ client: fakeClient(chat), model: 'llama3.1:8b' }).extract(request);
    expect(chat.mock.calls[1][0].model).toBe('llama3.1:8b');
  });

  test('encodes the no-invention guardrail and keeps the narrator’s language', async () => {
    const chat = respondWith(output);
    await new OllamaExtractor({ client: fakeClient(chat) }).extract(request);

    const system = String(chat.mock.calls[0][0].messages[0].content).toLowerCase();
    expect(system).toContain('never invent');
    expect(system).toContain('same language');
    for (const banned of ['wasted', 'failed', 'lazy', 'disappointing']) {
      expect(system).toContain(banned);
    }
  });

  test('returns candidates sorted by start time', async () => {
    const chat = respondWith({
      candidates: [
        { ...output.candidates[0], title: 'Sonra', startLocalTime: '14:00', endLocalTime: '15:00' },
        { ...output.candidates[0], title: 'Önce', startLocalTime: '08:00', endLocalTime: '09:00' },
      ],
      note: null,
    });

    const result = await new OllamaExtractor({ client: fakeClient(chat) }).extract(request);

    expect(result.candidates.map((c) => c.title)).toEqual(['Önce', 'Sonra']);
  });

  test('an empty response becomes a typed ExtractionError, not a crash', async () => {
    const chat = vi.fn().mockResolvedValue({ message: { content: '' } });

    await expect(
      new OllamaExtractor({ client: fakeClient(chat) }).extract(request),
    ).rejects.toBeInstanceOf(ExtractionError);
  });

  test('non-JSON content becomes a typed ExtractionError', async () => {
    const chat = vi.fn().mockResolvedValue({ message: { content: 'not json at all' } });

    await expect(
      new OllamaExtractor({ client: fakeClient(chat) }).extract(request),
    ).rejects.toBeInstanceOf(ExtractionError);
  });

  test('schema-violating output becomes a typed ExtractionError', async () => {
    const chat = respondWith({ candidates: [{ title: 'missing everything else' }], note: null });

    await expect(
      new OllamaExtractor({ client: fakeClient(chat) }).extract(request),
    ).rejects.toBeInstanceOf(ExtractionError);
  });

  test('a transport failure surfaces as ExtractionError', async () => {
    const chat = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:11434'));

    await expect(
      new OllamaExtractor({ client: fakeClient(chat) }).extract(request),
    ).rejects.toBeInstanceOf(ExtractionError);
  });
});
