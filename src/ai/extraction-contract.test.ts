import { describe, expect, it } from 'vitest';

import { ExtractionError } from '@/ai/errors';
import { normalizeLocalTime, toExtractionResult } from '@/ai/extraction-contract';

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Spor',
    description: null,
    category: null,
    categoryConfidence: null,
    startLocalTime: '09:00',
    endLocalTime: '10:00',
    timeConfidence: 0.8,
    people: [],
    place: null,
    ...overrides,
  };
}

describe('normalizeLocalTime', () => {
  it('pads a single-digit hour or minute', () => {
    expect(normalizeLocalTime('9:00')).toBe('09:00');
    expect(normalizeLocalTime('9:5')).toBe('09:05');
  });

  it('keeps a well-formed time and drops seconds', () => {
    expect(normalizeLocalTime('19:05')).toBe('19:05');
    expect(normalizeLocalTime('09:00:00')).toBe('09:00');
  });

  it('extracts HH:MM from a full ISO datetime (what some models return)', () => {
    expect(normalizeLocalTime('2026-07-08T09:00:00')).toBe('09:00');
    expect(normalizeLocalTime('2026-07-08T21:30:00Z')).toBe('21:30');
  });

  it('maps 24:00 to midnight', () => {
    expect(normalizeLocalTime('24:00')).toBe('00:00');
  });

  it('rejects empty, out-of-range, or garbage', () => {
    expect(normalizeLocalTime('')).toBeNull();
    expect(normalizeLocalTime('25:00')).toBeNull();
    expect(normalizeLocalTime('09:75')).toBeNull();
    expect(normalizeLocalTime('sabah')).toBeNull();
  });
});

describe('toExtractionResult', () => {
  it('normalizes loose times to HH:MM and sorts by start', () => {
    const result = toExtractionResult({
      candidates: [
        candidate({ title: 'Sonra', startLocalTime: '14:0', endLocalTime: '15:00' }),
        candidate({ title: 'Önce', startLocalTime: '9:00', endLocalTime: '10:00' }),
      ],
      note: null,
    });

    expect(result.candidates.map((c) => [c.title, c.startLocalTime, c.endLocalTime])).toEqual([
      ['Önce', '09:00', '10:00'],
      ['Sonra', '14:00', '15:00'],
    ]);
  });

  it('drops a candidate whose time cannot be placed, instead of failing the commit', () => {
    const result = toExtractionResult({
      candidates: [
        candidate({ title: 'Zamansız', startLocalTime: '', endLocalTime: '' }),
        candidate({ title: 'Kahvaltı', startLocalTime: '08:00', endLocalTime: '08:30' }),
      ],
      note: null,
    });

    expect(result.candidates.map((c) => c.title)).toEqual(['Kahvaltı']);
  });

  it('throws a typed ExtractionError on schema-invalid output', () => {
    expect(() => toExtractionResult({ candidates: [{ title: 'x' }], note: null })).toThrow(
      ExtractionError,
    );
  });
});
