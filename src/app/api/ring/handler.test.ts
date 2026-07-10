import { describe, expect, test } from 'vitest';

import { handleRingRequest } from '@/app/api/ring/handler';
import { InMemoryLifeEventRepository } from '@/data/in-memory-life-event-repository';
import { InMemoryUserStateRepository } from '@/data/in-memory-user-state-repository';
import { createLifeEvent } from '@/domain/life-event/factory';
import { DEFAULT_CATEGORY_PALETTE } from '@/domain/ring/palette';

const USER = 'user-1';
const TZ = 'Europe/Istanbul'; // UTC+3 in July
const DATE = '2026-07-02';

let counter = 0;

function makeEvent(startAt: string, endAt: string, overrides = {}) {
  counter += 1;
  return createLifeEvent(
    {
      userId: USER,
      title: `Memory ${counter}`,
      startAt,
      endAt,
      timezone: TZ,
      source: 'life-conversation',
      ...overrides,
    },
    { id: () => `event-${counter}`, now: () => `2026-07-02T19:00:${String(counter).padStart(2, '0')}.000Z` },
  );
}

function makeRepos() {
  return {
    events: new InMemoryLifeEventRepository(),
    state: new InMemoryUserStateRepository(),
  };
}

describe('handleRingRequest', () => {
  test.each([
    [{ date: 'nope', tz: TZ, period: 'today' }, 'date'],
    [{ date: DATE, tz: 'Not/AZone', period: 'today' }, 'tz'],
    [{ date: DATE, tz: TZ, period: 'decade' }, 'period'],
  ])('rejects invalid input %o', async (query, field) => {
    const { events, state } = makeRepos();

    const { status, body } = await handleRingRequest(query, events, state, USER);

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain(field);
  });

  test('an empty day: no segments, zero totals — never framed as failure', async () => {
    const { events, state } = makeRepos();

    const { status, body } = await handleRingRequest(
      { date: DATE, tz: TZ, period: 'today' },
      events,
      state,
      USER,
    );

    expect(status).toBe(200);
    expect(body.data).toMatchObject({
      period: 'today',
      date: DATE,
      fromDate: DATE,
      totalMinutes: 0,
      rememberedMinutes: 0,
      segments: [],
    });
  });

  test('today: categories get fixed palette colors in first-seen order and shares sum to 1', async () => {
    const { events, state } = makeRepos();
    // 09:00–11:00 Learning, 12:00–13:00 Health (local, UTC+3)
    await events.save(makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T08:00:00.000Z', { category: 'Learning' }));
    await events.save(makeEvent('2026-07-02T09:00:00.000Z', '2026-07-02T10:00:00.000Z', { category: 'Health' }));

    const { body } = await handleRingRequest({ date: DATE, tz: TZ, period: 'today' }, events, state, USER);
    const segments = body.data?.segments ?? [];

    expect(body.data?.layout).toBe('clock');
    const learning = segments.find((s) => s.kind === 'category' && s.category === 'Learning');
    const health = segments.find((s) => s.kind === 'category' && s.category === 'Health');
    expect(learning).toMatchObject({ color: DEFAULT_CATEGORY_PALETTE[0], durationMinutes: 120 });
    expect(health).toMatchObject({ color: DEFAULT_CATEGORY_PALETTE[1], durationMinutes: 60 });

    // Clock order is chronological: Learning (09:00) comes before Health (12:00),
    // each tagged with its real start time for the schedule-style legend.
    const categories = segments.filter((s) => s.kind === 'category');
    expect(categories[0]).toBe(learning);
    expect(learning).toMatchObject({ startLabel: '09:00', endLabel: '11:00' });
    expect(health).toMatchObject({ startLabel: '12:00', endLabel: '13:00' });
    const shareSum = segments.reduce((sum, s) => sum + s.share, 0);
    expect(shareSum).toBeCloseTo(1);

    // Assignment persisted for future requests (§5.2.3 — colors never change).
    const stored = await state.get(USER);
    expect(stored.categoryColors).toEqual({ Learning: 0, Health: 1 });
  });

  test('a category keeps its color when new categories appear later', async () => {
    const { events, state } = makeRepos();
    await events.save(makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T07:00:00.000Z', { category: 'Learning' }));
    await handleRingRequest({ date: DATE, tz: TZ, period: 'today' }, events, state, USER);

    await events.save(makeEvent('2026-07-02T07:00:00.000Z', '2026-07-02T09:00:00.000Z', { category: 'Family' }));
    const { body } = await handleRingRequest({ date: DATE, tz: TZ, period: 'today' }, events, state, USER);

    const stored = await state.get(USER);
    expect(stored.categoryColors).toEqual({ Learning: 0, Family: 1 });
    const learning = body.data?.segments.find((s) => s.kind === 'category' && s.category === 'Learning');
    expect(learning).toMatchObject({ color: DEFAULT_CATEGORY_PALETTE[0] });
  });

  test('today: each forgotten moment is its own segment with local time labels (§5.2.2)', async () => {
    const { events, state } = makeRepos();
    // 09:00–10:00, 13:00–14:00, 16:00–17:00 local → two forgotten gaps (3h and 2h)
    await events.save(makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T07:00:00.000Z'));
    await events.save(makeEvent('2026-07-02T10:00:00.000Z', '2026-07-02T11:00:00.000Z'));
    await events.save(makeEvent('2026-07-02T13:00:00.000Z', '2026-07-02T14:00:00.000Z'));

    const { body } = await handleRingRequest({ date: DATE, tz: TZ, period: 'today' }, events, state, USER);
    const forgotten = (body.data?.segments ?? []).filter((s) => s.kind === 'forgotten');

    expect(forgotten).toHaveLength(2);
    const slices = forgotten.flatMap((s) => (s.kind === 'forgotten' ? s.slices : []));
    expect(slices).toHaveLength(2);
    expect(slices[0]).toMatchObject({ startLabel: '10:00', endLabel: '13:00', durationMinutes: 180 });
    expect(slices[1]).toMatchObject({ startLabel: '14:00', endLabel: '16:00', durationMinutes: 120 });
  });

  test('week: gaps across days combine into one aggregate forgotten segment (§5.2.4)', async () => {
    const { events, state } = makeRepos();
    // Monday: 3h gap; Wednesday: 2h gap (both inside the trailing week ending 2026-07-02)
    await events.save(makeEvent('2026-06-29T06:00:00.000Z', '2026-06-29T07:00:00.000Z'));
    await events.save(makeEvent('2026-06-29T10:00:00.000Z', '2026-06-29T11:00:00.000Z'));
    await events.save(makeEvent('2026-07-01T06:00:00.000Z', '2026-07-01T07:00:00.000Z'));
    await events.save(makeEvent('2026-07-01T09:00:00.000Z', '2026-07-01T10:00:00.000Z'));

    const { body } = await handleRingRequest({ date: DATE, tz: TZ, period: 'week' }, events, state, USER);

    expect(body.data?.fromDate).toBe('2026-06-26');
    expect(body.data?.layout).toBe('aggregate');
    const forgotten = (body.data?.segments ?? []).filter((s) => s.kind === 'forgotten');
    expect(forgotten).toHaveLength(1);
    if (forgotten[0].kind !== 'forgotten') throw new Error('expected forgotten');
    expect(forgotten[0].durationMinutes).toBe(300);
    expect(forgotten[0].slices.map((s) => s.localDate)).toEqual(['2026-06-29', '2026-07-01']);
  });

  test('week: the same category sums across days into one segment', async () => {
    const { events, state } = makeRepos();
    await events.save(makeEvent('2026-06-30T06:00:00.000Z', '2026-06-30T08:00:00.000Z', { category: 'Learning' }));
    await events.save(makeEvent('2026-07-01T06:00:00.000Z', '2026-07-01T07:00:00.000Z', { category: 'Learning' }));

    const { body } = await handleRingRequest({ date: DATE, tz: TZ, period: 'week' }, events, state, USER);
    const categories = (body.data?.segments ?? []).filter((s) => s.kind === 'category');

    expect(categories).toHaveLength(1);
    expect(categories[0]).toMatchObject({ category: 'Learning', durationMinutes: 180 });
  });

  test('unremembered records surface as their own quiet segment, remembered minutes exclude them', async () => {
    const { events, state } = makeRepos();
    await events.save(makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T08:00:00.000Z', { category: 'Learning' }));
    await events.save(
      makeEvent('2026-07-02T08:00:00.000Z', '2026-07-02T09:00:00.000Z', {
        kind: 'unremembered',
        title: 'Unremembered time',
        source: 'gap-fill',
      }),
    );

    const { body } = await handleRingRequest({ date: DATE, tz: TZ, period: 'today' }, events, state, USER);

    // Clock order: night, Learning 09:00–11:00, unremembered 11:00–12:00, then
    // the rest of the day. Remembered minutes still exclude the unremembered hour.
    const kinds = (body.data?.segments ?? []).map((s) => s.kind);
    expect(kinds).toEqual(['unaccounted', 'category', 'unremembered', 'unaccounted']);
    expect(body.data?.totalMinutes).toBe(1440);
    expect(body.data?.rememberedMinutes).toBe(120);
  });
});
