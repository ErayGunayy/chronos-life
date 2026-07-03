import { describe, expect, test } from 'vitest';

import { StubExtractor } from '@/ai/stub-extractor';

const request = (narrative: string) => ({
  narrative,
  localDate: '2026-07-02',
  timezone: 'Europe/Istanbul',
});

describe('StubExtractor', () => {
  const extractor = new StubExtractor();

  test('identifies itself as the stub, never as AI', () => {
    expect(extractor.kind).toBe('stub');
  });

  test('parses a full line: time range, title, people, place, category', async () => {
    const result = await extractor.extract(
      request('09:00-10:30 Coffee with Sarah at Kadıköy #Social'),
    );

    expect(result.candidates).toEqual([
      {
        title: 'Coffee',
        description: null,
        category: 'Social',
        categoryConfidence: 0.9,
        startLocalTime: '09:00',
        endLocalTime: '10:30',
        timeConfidence: 1,
        people: ['Sarah'],
        place: 'Kadıköy',
      },
    ]);
    expect(result.note).toBeNull();
  });

  test('parses a bare line with only time range and title', async () => {
    const result = await extractor.extract(request('14:00-15:00 Deep work'));

    expect(result.candidates[0]).toMatchObject({
      title: 'Deep work',
      people: [],
      place: null,
      category: null,
      categoryConfidence: null,
    });
  });

  test('splits multiple people on commas and "and"', async () => {
    const result = await extractor.extract(
      request('19:00-21:00 Dinner with Anne, Baba and Elif'),
    );

    expect(result.candidates[0].people).toEqual(['Anne', 'Baba', 'Elif']);
  });

  test('parses place without people', async () => {
    const result = await extractor.extract(request('08:00-08:45 Breakfast at Home'));

    expect(result.candidates[0]).toMatchObject({ title: 'Breakfast', place: 'Home' });
  });

  test('handles multiple lines and sorts candidates by start time', async () => {
    const result = await extractor.extract(
      request('14:00-15:00 Reading\n09:00-10:00 Gym'),
    );

    expect(result.candidates.map((c) => c.title)).toEqual(['Gym', 'Reading']);
  });

  test('allows a cross-midnight range (end before start = next day)', async () => {
    const result = await extractor.extract(request('23:30-00:15 Night walk'));

    expect(result.candidates[0]).toMatchObject({
      startLocalTime: '23:30',
      endLocalTime: '00:15',
    });
  });

  test('skips lines without a time range and says so in the note, neutrally', async () => {
    const result = await extractor.extract(
      request('09:00-10:00 Gym\nthen I did some other stuff'),
    );

    expect(result.candidates).toHaveLength(1);
    expect(result.note).toContain('1');
    for (const banned of ['wasted', 'failed', 'lazy', 'disappointing']) {
      expect((result.note ?? '').toLowerCase()).not.toContain(banned);
    }
  });

  test('an empty narrative yields no candidates and a gentle note', async () => {
    const result = await extractor.extract(request('   '));

    expect(result.candidates).toEqual([]);
    expect(result.note).not.toBeNull();
  });

  test('ignores blank lines between entries', async () => {
    const result = await extractor.extract(request('09:00-10:00 Gym\n\n11:00-12:00 Study'));

    expect(result.candidates).toHaveLength(2);
    expect(result.note).toBeNull();
  });
});
