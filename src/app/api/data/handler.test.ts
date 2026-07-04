import { describe, expect, test } from 'vitest';

import { handleDeleteAllData } from '@/app/api/data/handler';
import { InMemoryLifeEventRepository } from '@/data/in-memory-life-event-repository';
import { InMemoryUserStateRepository } from '@/data/in-memory-user-state-repository';
import { EMPTY_USER_STATE } from '@/data/user-state-repository';
import { createLifeEvent } from '@/domain/life-event/factory';

const USER = 'user-1';
const OTHER_USER = 'user-2';

let counter = 0;

function makeEvent(userId: string) {
  counter += 1;
  return createLifeEvent(
    {
      userId,
      title: `Memory ${counter}`,
      startAt: '2026-07-02T06:00:00.000Z',
      endAt: '2026-07-02T07:00:00.000Z',
      timezone: 'Europe/Istanbul',
      source: 'life-conversation',
    },
    { id: () => `event-${counter}`, now: () => '2026-07-02T19:00:00.000Z' },
  );
}

function makeRepos() {
  return {
    events: new InMemoryLifeEventRepository(),
    state: new InMemoryUserStateRepository(),
  };
}

describe('handleDeleteAllData', () => {
  test('an account with nothing stored: zero deleted, never framed as failure', async () => {
    const { events, state } = makeRepos();

    const { status, body } = await handleDeleteAllData(events, state, USER);

    expect(status).toBe(200);
    expect(body.data).toMatchObject({ deletedEvents: 0 });
  });

  test('wipes every event and resets user state to empty', async () => {
    const { events, state } = makeRepos();
    await events.save(makeEvent(USER));
    await events.save(makeEvent(USER));
    await events.save(makeEvent(USER));
    await state.update(USER, (current) => ({
      ...current,
      categoryColors: { Learning: 0, Family: 1 },
    }));

    const { status, body } = await handleDeleteAllData(events, state, USER);

    expect(status).toBe(200);
    expect(body.data).toMatchObject({ deletedEvents: 3 });
    expect(await events.listAll(USER)).toEqual([]);
    expect(await state.get(USER)).toEqual(EMPTY_USER_STATE);
  });

  test('never touches another user’s events or state', async () => {
    const { events, state } = makeRepos();
    await events.save(makeEvent(USER));
    await events.save(makeEvent(OTHER_USER));
    await state.update(OTHER_USER, (current) => ({
      ...current,
      categoryColors: { Work: 0 },
    }));

    await handleDeleteAllData(events, state, USER);

    const otherEvents = await events.listAll(OTHER_USER);
    expect(otherEvents).toHaveLength(1);
    expect(await state.get(OTHER_USER)).toMatchObject({ categoryColors: { Work: 0 } });
  });
});
