import { describe, expect, test } from 'vitest';

import { handleDayRequest } from '@/app/api/day/handler';
import { InMemoryLifeEventRepository } from '@/data/in-memory-life-event-repository';
import { createLifeEvent } from '@/domain/life-event/factory';

const USER = 'user-1';
const TZ = 'Europe/Istanbul';
const query = { date: '2026-07-02', tz: TZ };

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
    { id: () => `event-${counter}`, now: () => '2026-07-02T19:00:00.000Z' },
  );
}

describe('handleDayRequest', () => {
  test('an empty day: no segments, null share, null invite — never framed as failure', async () => {
    const repo = new InMemoryLifeEventRepository();

    const { status, body } = await handleDayRequest(query, repo, USER);

    expect(status).toBe(200);
    expect(body.data).toMatchObject({
      date: '2026-07-02',
      timezone: TZ,
      rememberedShare: null,
      segments: [],
      invite: null,
    });
  });

  test('interleaves events and gaps with local labels, and bundles the invite', async () => {
    const repo = new InMemoryLifeEventRepository();
    // 09:00–10:00 and 13:00–14:00 local → a 3h Forgotten Moment between
    await repo.save(makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T07:00:00.000Z'));
    await repo.save(makeEvent('2026-07-02T10:00:00.000Z', '2026-07-02T11:00:00.000Z'));

    const { body } = await handleDayRequest(query, repo, USER);
    const segments = body.data?.segments ?? [];

    expect(segments.map((s) => s.type)).toEqual(['event', 'gap', 'event']);
    const gapSegment = segments[1];
    if (gapSegment.type !== 'gap') throw new Error('expected gap');
    expect(gapSegment.gap).toMatchObject({
      kind: 'forgotten-moment',
      startLabel: '10:00',
      endLabel: '13:00',
      durationMinutes: 180,
    });

    // Two 1h memories over the fixed 24h day (§5.8.4) — never over the narrated span.
    expect(body.data?.rememberedShare).toBeCloseTo(120 / 1440, 10);
    expect(body.data?.invite?.message).toContain('10:00–13:00');
  });

  test('an unremembered record renders as an event segment and is not re-invited (§6.5)', async () => {
    const repo = new InMemoryLifeEventRepository();
    await repo.save(makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T07:00:00.000Z'));
    await repo.save(
      makeEvent('2026-07-02T07:00:00.000Z', '2026-07-02T10:00:00.000Z', {
        kind: 'unremembered',
        title: undefined,
        source: 'gap-fill',
      }),
    );
    await repo.save(makeEvent('2026-07-02T10:00:00.000Z', '2026-07-02T11:00:00.000Z'));

    const { body } = await handleDayRequest(query, repo, USER);

    expect(body.data?.segments.map((s) => s.type)).toEqual(['event', 'event', 'event']);
    expect(body.data?.invite).toBeNull();
    const middle = body.data?.segments[1];
    if (middle?.type !== 'event') throw new Error('expected event');
    expect(middle.event.kind).toBe('unremembered');
  });

  test('event labels use wall-clock local time', async () => {
    const repo = new InMemoryLifeEventRepository();
    await repo.save(makeEvent('2026-07-02T06:00:00.000Z', '2026-07-02T07:30:00.000Z'));

    const { body } = await handleDayRequest(query, repo, USER);
    const first = body.data?.segments[0];
    if (first?.type !== 'event') throw new Error('expected event');

    expect(first.event.startLabel).toBe('09:00');
    expect(first.event.endLabel).toBe('10:30');
  });

  test('rejects a malformed date or timezone', async () => {
    const repo = new InMemoryLifeEventRepository();

    expect((await handleDayRequest({ date: 'nope', tz: TZ }, repo, USER)).status).toBe(400);
    expect((await handleDayRequest({ date: '2026-07-02', tz: 'Nope/Nope' }, repo, USER)).status).toBe(
      400,
    );
    expect((await handleDayRequest({ date: null, tz: null }, repo, USER)).status).toBe(400);
  });
});
