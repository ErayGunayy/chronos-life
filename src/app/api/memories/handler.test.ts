import { describe, expect, test } from 'vitest';

import { handleCommitMemories } from '@/app/api/memories/handler';
import { InMemoryLifeEventRepository } from '@/data/in-memory-life-event-repository';

const USER = 'user-1';

const base = {
  localDate: '2026-07-02',
  timezone: 'Europe/Istanbul',
};

describe('handleCommitMemories', () => {
  test('commits a reviewed candidate with local times as a substantive memory', async () => {
    const repo = new InMemoryLifeEventRepository();

    const { status, body } = await handleCommitMemories(
      {
        ...base,
        memories: [
          {
            title: 'Gym',
            startLocalTime: '09:00',
            endLocalTime: '10:00',
            category: 'Health',
            categoryConfidence: 0.9,
            people: [],
          },
        ],
      },
      repo,
      USER,
    );

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.ids).toHaveLength(1);

    const stored = await repo.listAll(USER);
    expect(stored[0]).toMatchObject({
      title: 'Gym',
      startAt: '2026-07-02T06:00:00.000Z',
      endAt: '2026-07-02T07:00:00.000Z',
      kind: 'substantive',
      source: 'life-conversation',
      category: 'Health',
    });
  });

  test('records "I don\'t remember" as a real unremembered memory via UTC instants (§6.4)', async () => {
    const repo = new InMemoryLifeEventRepository();

    const { status } = await handleCommitMemories(
      {
        ...base,
        memories: [
          {
            kind: 'unremembered',
            source: 'gap-fill',
            startAt: '2026-07-02T07:00:00.000Z',
            endAt: '2026-07-02T10:00:00.000Z',
          },
        ],
      },
      repo,
      USER,
    );

    expect(status).toBe(200);
    const stored = await repo.listAll(USER);
    expect(stored[0]).toMatchObject({
      kind: 'unremembered',
      title: '',
      source: 'gap-fill',
      startAt: '2026-07-02T07:00:00.000Z',
    });
  });

  test('saves multiple memories in one commit', async () => {
    const repo = new InMemoryLifeEventRepository();

    const { body } = await handleCommitMemories(
      {
        ...base,
        memories: [
          { title: 'Gym', startLocalTime: '09:00', endLocalTime: '10:00' },
          { title: 'Reading', startLocalTime: '21:00', endLocalTime: '22:00' },
        ],
      },
      repo,
      USER,
    );

    expect(body.data?.ids).toHaveLength(2);
    expect(await repo.listAll(USER)).toHaveLength(2);
  });

  test('rejects a memory with neither local times nor instants', async () => {
    const repo = new InMemoryLifeEventRepository();

    const { status } = await handleCommitMemories(
      { ...base, memories: [{ title: 'Mystery' }] },
      repo,
      USER,
    );

    expect(status).toBe(400);
    expect(await repo.listAll(USER)).toEqual([]);
  });

  test('a single invalid memory rejects the whole commit — nothing partial persists', async () => {
    const repo = new InMemoryLifeEventRepository();

    const { status, body } = await handleCommitMemories(
      {
        ...base,
        memories: [
          { title: 'Fine', startLocalTime: '09:00', endLocalTime: '10:00' },
          {
            title: 'Broken',
            startAt: '2026-07-02T10:00:00.000Z',
            endAt: '2026-07-02T09:00:00.000Z',
          },
        ],
      },
      repo,
      USER,
    );

    expect(status).toBe(400);
    expect(body.error).toContain('memories[1]');
    expect(await repo.listAll(USER)).toEqual([]);
  });

  test('rejects an invalid timezone at the boundary', async () => {
    const repo = new InMemoryLifeEventRepository();

    const { status } = await handleCommitMemories(
      {
        ...base,
        timezone: 'Mars/Olympus_Mons',
        memories: [{ title: 'Gym', startLocalTime: '09:00', endLocalTime: '10:00' }],
      },
      repo,
      USER,
    );

    expect(status).toBe(400);
  });

  test('rejects a non-object body', async () => {
    const { status } = await handleCommitMemories(null, new InMemoryLifeEventRepository(), USER);

    expect(status).toBe(400);
  });

  test('a save failure mid-commit rolls back and reports that nothing was kept', async () => {
    class FailingRepo extends InMemoryLifeEventRepository {
      private saveCalls = 0;
      override async save(event: Parameters<InMemoryLifeEventRepository['save']>[0]) {
        this.saveCalls += 1;
        if (this.saveCalls === 2) throw new Error('disk full');
        return super.save(event);
      }
    }
    const repo = new FailingRepo();

    const { status, body } = await handleCommitMemories(
      {
        ...base,
        memories: [
          { title: 'First', startLocalTime: '09:00', endLocalTime: '10:00' },
          { title: 'Second', startLocalTime: '11:00', endLocalTime: '12:00' },
        ],
      },
      repo,
      USER,
    );

    expect(status).toBe(500);
    expect(body.error).toContain('nothing from this commit');
    expect(await repo.listAll(USER)).toEqual([]);
  });
});
