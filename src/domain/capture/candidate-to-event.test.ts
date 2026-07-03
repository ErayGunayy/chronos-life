import { describe, expect, test } from 'vitest';

import { candidateToNewLifeEvent } from '@/domain/capture/candidate-to-event';
import type { CandidateEvent } from '@/domain/capture/types';

const context = {
  userId: 'user-1',
  localDate: '2026-07-02',
  timezone: 'Europe/Istanbul',
  source: 'life-conversation' as const,
};

function candidate(overrides: Partial<CandidateEvent> = {}): CandidateEvent {
  return {
    title: 'Coffee with Sarah',
    description: null,
    category: 'Social',
    categoryConfidence: 0.9,
    startLocalTime: '09:00',
    endLocalTime: '10:30',
    timeConfidence: 0.8,
    people: ['Sarah'],
    place: 'Kadıköy',
    ...overrides,
  };
}

describe('candidateToNewLifeEvent', () => {
  test('converts local wall-clock times to UTC instants (Istanbul is UTC+3 in July)', () => {
    const input = candidateToNewLifeEvent(candidate(), context);

    expect(input).toMatchObject({
      userId: 'user-1',
      title: 'Coffee with Sarah',
      startAt: '2026-07-02T06:00:00.000Z',
      endAt: '2026-07-02T07:30:00.000Z',
      timezone: 'Europe/Istanbul',
      source: 'life-conversation',
      people: ['Sarah'],
      place: 'Kadıköy',
      category: 'Social',
      categoryConfidence: 0.9,
    });
  });

  test('an end time before the start time rolls to the next day (cross-midnight)', () => {
    const input = candidateToNewLifeEvent(
      candidate({ startLocalTime: '23:30', endLocalTime: '00:15' }),
      context,
    );

    // 23:30 Istanbul on 2 July = 20:30Z; 00:15 on 3 July = 21:15Z on 2 July
    expect(input.startAt).toBe('2026-07-02T20:30:00.000Z');
    expect(input.endAt).toBe('2026-07-02T21:15:00.000Z');
  });

  test('resolves wall-clock times correctly across a DST boundary day', () => {
    const input = candidateToNewLifeEvent(
      candidate({ startLocalTime: '01:00', endLocalTime: '04:00' }),
      { ...context, localDate: '2026-03-08', timezone: 'America/New_York' },
    );

    // 01:00 is EST (UTC-5) → 06:00Z; 04:00 is EDT (UTC-4) → 08:00Z (2am–3am never happened)
    expect(input.startAt).toBe('2026-03-08T06:00:00.000Z');
    expect(input.endAt).toBe('2026-03-08T08:00:00.000Z');
  });

  test('carries a null category as null confidence too', () => {
    const input = candidateToNewLifeEvent(
      candidate({ category: null, categoryConfidence: null }),
      context,
    );

    expect(input.category).toBeNull();
    expect(input.categoryConfidence).toBeNull();
  });

  test('the produced input creates a valid LifeEvent via the factory', async () => {
    const { createLifeEvent } = await import('@/domain/life-event/factory');
    const input = candidateToNewLifeEvent(candidate(), context);

    const event = createLifeEvent(input, {
      id: () => 'event-1',
      now: () => '2026-07-02T19:00:00.000Z',
    });

    expect(event.title).toBe('Coffee with Sarah');
    expect(Date.parse(event.endAt)).toBeGreaterThan(Date.parse(event.startAt));
  });

  test('rejects a malformed local time with a clear error', () => {
    expect(() =>
      candidateToNewLifeEvent(candidate({ startLocalTime: '9am' }), context),
    ).toThrowError(/startLocalTime|local time/i);
  });
});
