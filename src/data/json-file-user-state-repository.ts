import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { InMemoryUserStateRepository } from '@/data/in-memory-user-state-repository';
import {
  EMPTY_USER_STATE,
  type UserState,
  type UserStateRepository,
} from '@/data/user-state-repository';

const FILE_SCHEMA_VERSION = 1;

/**
 * File-backed user state until Supabase is provisioned (CLAUDE.md §8).
 * Same durability rules as JsonFileLifeEventRepository: memoized load,
 * serialized mutations, atomic writes, and a loud refusal to overwrite an
 * unreadable file — color assignments and chapters are small, but losing
 * them silently would still break trust (§5.11).
 */
export class JsonFileUserStateRepository implements UserStateRepository {
  private inner: InMemoryUserStateRepository | null = null;
  private loadPromise: Promise<InMemoryUserStateRepository> | null = null;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async get(userId: string): Promise<UserState> {
    return (await this.ensureLoaded()).get(userId);
  }

  update(userId: string, updater: (state: UserState) => UserState): Promise<UserState> {
    const run = this.writeQueue.then(async () => {
      const inner = await this.ensureLoaded();
      const next = await inner.update(userId, updater);
      await this.persist(inner);
      return next;
    });
    this.writeQueue = run.catch(() => undefined);
    return run;
  }

  private ensureLoaded(): Promise<InMemoryUserStateRepository> {
    if (this.inner) return Promise.resolve(this.inner);
    this.loadPromise ??= this.loadFromDisk().then(
      (inner) => {
        this.inner = inner;
        return inner;
      },
      (error: unknown) => {
        this.loadPromise = null;
        throw error;
      },
    );
    return this.loadPromise;
  }

  private async loadFromDisk(): Promise<InMemoryUserStateRepository> {
    const inner = new InMemoryUserStateRepository();
    let raw: string | null = null;
    try {
      raw = await readFile(this.filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    if (raw !== null) {
      for (const [userId, state] of Object.entries(parseStateFile(raw, this.filePath))) {
        inner.restore(userId, state);
      }
    }
    return inner;
  }

  private async persist(inner: InMemoryUserStateRepository): Promise<void> {
    const payload = JSON.stringify(
      { schemaVersion: FILE_SCHEMA_VERSION, users: inner.snapshot() },
      null,
      2,
    );
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      await writeFile(tmpPath, payload, 'utf8');
      await rename(tmpPath, this.filePath);
    } catch (error) {
      await rm(tmpPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }
}

function parseStateFile(raw: string, filePath: string): Record<string, UserState> {
  const refusal = (reason: string, cause?: unknown) =>
    new Error(
      `state file ${filePath} ${reason} — refusing to load or overwrite it. Fix or move the file, then restart.`,
      cause ? { cause } : undefined,
    );

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw refusal('is not readable JSON', error);
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as { schemaVersion?: unknown }).schemaVersion !== FILE_SCHEMA_VERSION ||
    typeof (parsed as { users?: unknown }).users !== 'object' ||
    (parsed as { users?: unknown }).users === null
  ) {
    throw refusal(`does not match schemaVersion ${FILE_SCHEMA_VERSION}`);
  }

  const users = (parsed as { users: Record<string, Partial<UserState>> }).users;
  return Object.fromEntries(
    Object.entries(users).map(([userId, state]) => [
      userId,
      {
        ...EMPTY_USER_STATE,
        ...state,
      },
    ]),
  );
}
