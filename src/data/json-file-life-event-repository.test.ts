import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { JsonFileLifeEventRepository } from '@/data/json-file-life-event-repository';
import { createLifeEvent } from '@/domain/life-event/factory';

let counter = 0;

function makeEvent(overrides: Partial<Parameters<typeof createLifeEvent>[0]> = {}) {
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
    { id: () => `event-${counter}`, now: () => '2026-07-02T19:00:00.000Z' },
  );
}

function tempFile(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'chronos-test-'));
  return path.join(dir, 'life-events.json');
}

describe('JsonFileLifeEventRepository', () => {
  test('memories survive a process restart (new instance, same file)', async () => {
    const file = tempFile();
    const event = makeEvent();

    await new JsonFileLifeEventRepository(file).save(event);
    const reopened = new JsonFileLifeEventRepository(file);

    expect(await reopened.getById(event.userId, event.id)).toEqual(event);
  });

  test('deletion is real and persists across instances (§5.11)', async () => {
    const file = tempFile();
    const event = makeEvent();
    const repo = new JsonFileLifeEventRepository(file);
    await repo.save(event);

    expect(await repo.deleteById(event.userId, event.id)).toBe(true);

    const reopened = new JsonFileLifeEventRepository(file);
    expect(await reopened.getById(event.userId, event.id)).toBeNull();
  });

  test('deleteAll persists and reports the count', async () => {
    const file = tempFile();
    const repo = new JsonFileLifeEventRepository(file);
    await repo.save(makeEvent());
    await repo.save(makeEvent());

    expect(await repo.deleteAll('user-1')).toBe(2);
    expect(await new JsonFileLifeEventRepository(file).listAll('user-1')).toEqual([]);
  });

  test('listBetween keeps the half-open overlap contract', async () => {
    const file = tempFile();
    const repo = new JsonFileLifeEventRepository(file);
    const event = makeEvent({
      startAt: '2026-07-02T10:00:00.000Z',
      endAt: '2026-07-02T11:00:00.000Z',
    });
    await repo.save(event);

    const hit = await repo.listBetween('user-1', '2026-07-02T10:30:00.000Z', '2026-07-02T12:00:00.000Z');
    const miss = await repo.listBetween('user-1', '2026-07-02T11:00:00.000Z', '2026-07-02T12:00:00.000Z');

    expect(hit.map((e) => e.id)).toEqual([event.id]);
    expect(miss).toEqual([]);
  });

  test('a corrupted file throws loudly instead of silently wiping personal history (§5.11)', async () => {
    const file = tempFile();
    writeFileSync(file, '{not json at all');

    const repo = new JsonFileLifeEventRepository(file);

    await expect(repo.listAll('user-1')).rejects.toThrowError(/refusing/i);
  });

  test('an unexpected schema also refuses to load', async () => {
    const file = tempFile();
    writeFileSync(file, JSON.stringify({ schemaVersion: 99, events: [] }));

    await expect(new JsonFileLifeEventRepository(file).listAll('user-1')).rejects.toThrowError(
      /refusing/i,
    );
  });
});
