import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { InMemoryUserStateRepository } from '@/data/in-memory-user-state-repository';
import { JsonFileUserStateRepository } from '@/data/json-file-user-state-repository';
import { EMPTY_USER_STATE, type UserState } from '@/data/user-state-repository';

const USER = 'user-a';

describe('InMemoryUserStateRepository', () => {
  it('returns empty state for an unknown user', async () => {
    // Arrange
    const repository = new InMemoryUserStateRepository();

    // Act
    const state = await repository.get(USER);

    // Assert
    expect(state).toEqual(EMPTY_USER_STATE);
  });

  it('applies updates immutably and keeps users isolated', async () => {
    // Arrange
    const repository = new InMemoryUserStateRepository();

    // Act
    const updated = await repository.update(USER, (state) => ({
      ...state,
      categoryColors: { ...state.categoryColors, Learning: 0 },
      sleepWindow: { start: '23:00', end: '07:00' },
    }));

    // Assert
    expect(updated.categoryColors).toEqual({ Learning: 0 });
    expect(updated.sleepWindow).toEqual({ start: '23:00', end: '07:00' });
    expect(await repository.get('someone-else')).toEqual(EMPTY_USER_STATE);
    expect(Object.isFrozen(updated)).toBe(true);
    expect(Object.isFrozen(updated.categoryColors)).toBe(true);
  });

  it('chains updates so later ones see earlier results', async () => {
    // Arrange
    const repository = new InMemoryUserStateRepository();
    await repository.update(USER, (state) => ({
      ...state,
      dismissedChapterKeys: ['category:internship'],
    }));

    // Act
    const next = await repository.update(USER, (state) => ({
      ...state,
      dismissedChapterKeys: [...state.dismissedChapterKeys, 'place:istanbul'],
    }));

    // Assert
    expect(next.dismissedChapterKeys).toEqual(['category:internship', 'place:istanbul']);
  });
});

describe('JsonFileUserStateRepository', () => {
  let dir: string;
  let filePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'chronos-state-'));
    filePath = path.join(dir, 'user-state.json');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('persists updates and reloads them from disk', async () => {
    // Arrange
    const first = new JsonFileUserStateRepository(filePath);
    await first.update(USER, (state) => ({
      ...state,
      categoryColors: { Learning: 0, Health: 1 },
      sleepWindow: { start: '23:30', end: '07:15' },
    }));

    // Act — a fresh instance simulating a server restart
    const second = new JsonFileUserStateRepository(filePath);
    const reloaded = await second.get(USER);

    // Assert
    expect(reloaded.categoryColors).toEqual({ Learning: 0, Health: 1 });
    expect(reloaded.sleepWindow).toEqual({ start: '23:30', end: '07:15' });
  });

  it('serializes concurrent updates so no write is lost', async () => {
    // Arrange
    const repository = new JsonFileUserStateRepository(filePath);
    const addColor = (name: string, index: number) =>
      repository.update(USER, (state) => ({
        ...state,
        categoryColors: { ...state.categoryColors, [name]: index },
      }));

    // Act — fire without awaiting in between
    await Promise.all([addColor('A', 0), addColor('B', 1), addColor('C', 2)]);

    // Assert
    const state = await repository.get(USER);
    expect(state.categoryColors).toEqual({ A: 0, B: 1, C: 2 });
    const onDisk = JSON.parse(await readFile(filePath, 'utf8')) as {
      users: Record<string, UserState>;
    };
    expect(onDisk.users[USER].categoryColors).toEqual({ A: 0, B: 1, C: 2 });
  });

  it('fills missing fields with defaults when loading an older/partial file', async () => {
    // Arrange — a file written before some fields existed
    await writeFile(
      filePath,
      JSON.stringify({
        schemaVersion: 1,
        users: { [USER]: { categoryColors: { Learning: 0 } } },
      }),
      'utf8',
    );

    // Act
    const repository = new JsonFileUserStateRepository(filePath);
    const state = await repository.get(USER);

    // Assert
    expect(state.categoryColors).toEqual({ Learning: 0 });
    expect(state.sleepWindow).toBeNull();
    expect(state.chapters).toEqual([]);
    expect(state.dismissedChapterKeys).toEqual([]);
  });

  it('refuses to load an unreadable file instead of resetting it', async () => {
    // Arrange
    await writeFile(filePath, 'not json at all', 'utf8');
    const repository = new JsonFileUserStateRepository(filePath);

    // Act + Assert
    await expect(repository.get(USER)).rejects.toThrow(/refusing to load/);
    expect(await readFile(filePath, 'utf8')).toBe('not json at all');
  });
});
