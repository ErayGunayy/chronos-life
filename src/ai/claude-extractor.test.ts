import { describe, expect, test, vi } from 'vitest';

import { ClaudeExtractor, type MinimalAnthropicClient } from '@/ai/claude-extractor';
import { ExtractionError } from '@/ai/errors';

const request = {
  narrative: 'I had coffee with Sarah this morning around nine for an hour and a half.',
  localDate: '2026-07-02',
  timezone: 'Europe/Istanbul',
};

const parsedOutput = {
  candidates: [
    {
      title: 'Coffee with Sarah',
      description: null,
      category: 'Social',
      categoryConfidence: 0.8,
      startLocalTime: '09:00',
      endLocalTime: '10:30',
      timeConfidence: 0.6,
      people: ['Sarah'],
      place: null,
    },
  ],
  note: null,
};

function fakeClient(parse: ReturnType<typeof vi.fn>): MinimalAnthropicClient {
  return { messages: { parse } } as unknown as MinimalAnthropicClient;
}

describe('ClaudeExtractor (contract, mocked client)', () => {
  test('identifies itself as claude', () => {
    const extractor = new ClaudeExtractor({ client: fakeClient(vi.fn()) });

    expect(extractor.kind).toBe('claude');
  });

  test('sends the narrative, local date, and timezone to the model', async () => {
    const parse = vi.fn().mockResolvedValue({ parsed_output: parsedOutput });
    const extractor = new ClaudeExtractor({ client: fakeClient(parse) });

    await extractor.extract(request);

    expect(parse).toHaveBeenCalledTimes(1);
    const call = parse.mock.calls[0][0];
    const serialized = JSON.stringify(call);
    expect(serialized).toContain('coffee with Sarah');
    expect(serialized).toContain('2026-07-02');
    expect(serialized).toContain('Europe/Istanbul');
  });

  test('uses the configured model, defaulting to claude-sonnet-5 (CLAUDE.md §8)', async () => {
    const parse = vi.fn().mockResolvedValue({ parsed_output: parsedOutput });

    await new ClaudeExtractor({ client: fakeClient(parse) }).extract(request);
    expect(parse.mock.calls[0][0].model).toBe('claude-sonnet-5');

    await new ClaudeExtractor({ client: fakeClient(parse), model: 'claude-haiku-4-5' }).extract(
      request,
    );
    expect(parse.mock.calls[1][0].model).toBe('claude-haiku-4-5');
  });

  test('encodes the no-invention guardrail in the system prompt (§4 AI rules)', async () => {
    const parse = vi.fn().mockResolvedValue({ parsed_output: parsedOutput });
    const extractor = new ClaudeExtractor({ client: fakeClient(parse) });

    await extractor.extract(request);

    const system = String(parse.mock.calls[0][0].system);
    expect(system.toLowerCase()).toContain('never invent');
    for (const banned of ['wasted', 'failed', 'lazy', 'disappointing']) {
      expect(system.toLowerCase().includes(`"${banned}"`) || system.toLowerCase().includes(banned)).toBe(
        true,
      );
    }
  });

  test('returns the parsed candidates sorted by start time', async () => {
    const shuffled = {
      candidates: [
        { ...parsedOutput.candidates[0], title: 'Later', startLocalTime: '14:00', endLocalTime: '15:00' },
        { ...parsedOutput.candidates[0], title: 'Earlier', startLocalTime: '08:00', endLocalTime: '09:00' },
      ],
      note: null,
    };
    const parse = vi.fn().mockResolvedValue({ parsed_output: shuffled });
    const extractor = new ClaudeExtractor({ client: fakeClient(parse) });

    const result = await extractor.extract(request);

    expect(result.candidates.map((c) => c.title)).toEqual(['Earlier', 'Later']);
  });

  test('a null parsed_output becomes a typed ExtractionError, not a crash', async () => {
    const parse = vi.fn().mockResolvedValue({ parsed_output: null });
    const extractor = new ClaudeExtractor({ client: fakeClient(parse) });

    await expect(extractor.extract(request)).rejects.toBeInstanceOf(ExtractionError);
  });

  test('API failures surface as ExtractionError with a friendly message and no key material', async () => {
    const parse = vi.fn().mockRejectedValue(new Error('401 invalid x-api-key sk-ant-secret'));
    const extractor = new ClaudeExtractor({ client: fakeClient(parse) });

    const failure = await extractor.extract(request).then(
      () => null,
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ExtractionError);
    expect(String((failure as Error).message)).not.toContain('sk-ant');
  });
});
