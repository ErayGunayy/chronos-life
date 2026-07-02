import { describe, expect, test } from 'vitest';

import { createLifeEvent } from '@/domain/life-event/factory';
import type { LifeEvent } from '@/domain/life-event/types';
import { InMemoryLifeEventRepository } from '@/data/in-memory-life-event-repository';

const deps = { id: () => 'ignored', now: () => '2026-07-02T19:00:00.000Z' };

let counter = 0;

function makeEvent(overrides: Partial<Parameters<typeof createLifeEvent>[0]> = {}): LifeEvent {
  counter += 1;
  return createLifeEvent(
    {
      userId: 'user-1',
      title: `Memory ${counter}`,
      startAt: '2026-07-02T06:00:00.000Z',
      endAt: '2026-07-02T07:00:00.000Z',
      timezone: 'Europe/Istanbul',
      source: 'life-conversation',
      ...overrides,
    },
    { ...deps, id: () => `event-${counter}` },
  );
}

describe('InMemoryLifeEventRepository', () => {
  test('save then getById returns the event', async () => {
    const repo = new InMemoryLifeEventRepository();
    const event = makeEvent();

    await repo.save(event);

    expect(await repo.getById(event.userId, event.id)).toEqual(event);
  });

  test('getById returns null for another user, even with the right id', async () => {
    const repo = new InMemoryLifeEventRepository();
    const event = makeEvent();
    await repo.save(event);

    expect(await repo.getById('someone-else', event.id)).toBeNull();
  });

  test('saving the same id again replaces the stored event', async () => {
    const repo = new InMemoryLifeEventRepository();
    const event = makeEvent();
    await repo.save(event);

    const edited = { ...event, title: 'Edited title', version: 2 };
    await repo.save(edited);

    const stored = await repo.getById(event.userId, event.id);
    expect(stored?.title).toBe('Edited title');
    expect(stored?.version).toBe(2);
  });

  test('stored events are frozen even when the caller passed a plain object', async () => {
    const repo = new InMemoryLifeEventRepository();
    const plain = { ...makeEvent(), people: ['Sarah'] };

    await repo.save(plain);

    const stored = await repo.getById(plain.userId, plain.id);
    expect(Object.isFrozen(stored)).toBe(true);
    expect(Object.isFrozen(stored?.people)).toBe(true);
  });

  describe('listBetween — half-open [from, to) overlap semantics', () => {
    const event = makeEvent({
      startAt: '2026-07-02T10:00:00.000Z',
      endAt: '2026-07-02T11:00:00.000Z',
    });

    test('includes an event that overlaps the range', async () => {
      const repo = new InMemoryLifeEventRepository();
      await repo.save(event);

      const found = await repo.listBetween(
        event.userId,
        '2026-07-02T10:30:00.000Z',
        '2026-07-02T12:00:00.000Z',
      );

      expect(found.map((e) => e.id)).toEqual([event.id]);
    });

    test('excludes an event that ends exactly when the range starts', async () => {
      const repo = new InMemoryLifeEventRepository();
      await repo.save(event);

      const found = await repo.listBetween(
        event.userId,
        '2026-07-02T11:00:00.000Z',
        '2026-07-02T12:00:00.000Z',
      );

      expect(found).toEqual([]);
    });

    test('excludes an event that starts exactly when the range ends', async () => {
      const repo = new InMemoryLifeEventRepository();
      await repo.save(event);

      const found = await repo.listBetween(
        event.userId,
        '2026-07-02T09:00:00.000Z',
        '2026-07-02T10:00:00.000Z',
      );

      expect(found).toEqual([]);
    });

    test('returns events sorted by startAt, then id for determinism', async () => {
      const repo = new InMemoryLifeEventRepository();
      const later = makeEvent({
        startAt: '2026-07-02T14:00:00.000Z',
        endAt: '2026-07-02T15:00:00.000Z',
      });
      const earlier = makeEvent({
        startAt: '2026-07-02T08:00:00.000Z',
        endAt: '2026-07-02T09:00:00.000Z',
      });
      await repo.save(later);
      await repo.save(earlier);

      const found = await repo.listBetween(
        'user-1',
        '2026-07-02T00:00:00.000Z',
        '2026-07-03T00:00:00.000Z',
      );

      expect(found.map((e) => e.id)).toEqual([earlier.id, later.id]);
    });

    test('never returns events belonging to another user', async () => {
      const repo = new InMemoryLifeEventRepository();
      await repo.save(makeEvent({ userId: 'user-2' }));

      const found = await repo.listBetween(
        'user-1',
        '2026-07-02T00:00:00.000Z',
        '2026-07-03T00:00:00.000Z',
      );

      expect(found).toEqual([]);
    });
  });

  test('listAll returns every event for the user only', async () => {
    const repo = new InMemoryLifeEventRepository();
    const mine = makeEvent();
    await repo.save(mine);
    await repo.save(makeEvent({ userId: 'user-2' }));

    const found = await repo.listAll('user-1');

    expect(found.map((e) => e.id)).toEqual([mine.id]);
  });

  test('deleteById removes the event and reports whether it existed', async () => {
    const repo = new InMemoryLifeEventRepository();
    const event = makeEvent();
    await repo.save(event);

    expect(await repo.deleteById(event.userId, event.id)).toBe(true);
    expect(await repo.getById(event.userId, event.id)).toBeNull();
    expect(await repo.deleteById(event.userId, event.id)).toBe(false);
  });

  test('deleteById never deletes across users', async () => {
    const repo = new InMemoryLifeEventRepository();
    const event = makeEvent();
    await repo.save(event);

    expect(await repo.deleteById('someone-else', event.id)).toBe(false);
    expect(await repo.getById(event.userId, event.id)).toEqual(event);
  });

  test('deleteAll removes only events owned by that user and returns the count', async () => {
    const repo = new InMemoryLifeEventRepository();
    await repo.save(makeEvent());
    await repo.save(makeEvent());
    const other = makeEvent({ userId: 'user-2' });
    await repo.save(other);

    expect(await repo.deleteAll('user-1')).toBe(2);
    expect(await repo.listAll('user-1')).toEqual([]);
    expect(await repo.listAll('user-2')).toEqual([other]);
  });
});
