import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { InMemoryLifeEventRepository } from '@/data/in-memory-life-event-repository';
import type { LifeEventRepository } from '@/data/life-event-repository';
import type { LifeEvent } from '@/domain/life-event/types';

const FILE_SCHEMA_VERSION = 1;

/**
 * File-backed repository for local dev until Supabase is provisioned
 * (CLAUDE.md §8). Durability rules follow §5.11:
 *
 * - the first disk load is memoized, so concurrent callers share one store;
 * - every mutation (save/delete) runs through a single write queue — mutate
 *   and persist are serialized, so a resolved save() is truly on disk;
 * - writes are atomic (unique tmp file + rename) and an unreadable file
 *   throws loudly — this code never silently resets personal history.
 *
 * Scope limit: one server process per data file. Multiple processes writing
 * the same file would last-write-win whole files; that is what the Supabase
 * repository is for.
 */
export class JsonFileLifeEventRepository implements LifeEventRepository {
  private inner: InMemoryLifeEventRepository | null = null;
  private loadPromise: Promise<InMemoryLifeEventRepository> | null = null;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async save(event: LifeEvent): Promise<void> {
    await this.enqueueMutation((inner) => inner.save(event));
  }

  async getById(userId: string, id: string): Promise<LifeEvent | null> {
    return (await this.ensureLoaded()).getById(userId, id);
  }

  async listBetween(userId: string, fromUtc: string, toUtc: string): Promise<LifeEvent[]> {
    return (await this.ensureLoaded()).listBetween(userId, fromUtc, toUtc);
  }

  async listAll(userId: string): Promise<LifeEvent[]> {
    return (await this.ensureLoaded()).listAll(userId);
  }

  async deleteById(userId: string, id: string): Promise<boolean> {
    return this.enqueueMutation((inner) => inner.deleteById(userId, id));
  }

  async deleteAll(userId: string): Promise<number> {
    return this.enqueueMutation((inner) => inner.deleteAll(userId));
  }

  /** Mutations run strictly one at a time: load → mutate → persist. */
  private enqueueMutation<T>(
    mutate: (inner: InMemoryLifeEventRepository) => Promise<T>,
  ): Promise<T> {
    const run = this.writeQueue.then(async () => {
      const inner = await this.ensureLoaded();
      const result = await mutate(inner);
      await this.persist(inner);
      return result;
    });
    // Keep the queue alive even when an operation rejects; the caller
    // still receives the rejection through `run`.
    this.writeQueue = run.catch(() => undefined);
    return run;
  }

  private ensureLoaded(): Promise<InMemoryLifeEventRepository> {
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

  private async loadFromDisk(): Promise<InMemoryLifeEventRepository> {
    const inner = new InMemoryLifeEventRepository();
    let raw: string | null = null;
    try {
      raw = await readFile(this.filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    if (raw !== null) {
      for (const event of parseStoreFile(raw, this.filePath)) {
        await inner.save(event);
      }
    }
    return inner;
  }

  private async persist(inner: InMemoryLifeEventRepository): Promise<void> {
    const payload = JSON.stringify(
      { schemaVersion: FILE_SCHEMA_VERSION, events: inner.snapshot() },
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

function parseStoreFile(raw: string, filePath: string): LifeEvent[] {
  const refusal = (reason: string, cause?: unknown) =>
    new Error(
      `memory file ${filePath} ${reason} — refusing to load or overwrite personal history. Fix or move the file, then restart.`,
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
    !Array.isArray((parsed as { events?: unknown }).events)
  ) {
    throw refusal(`does not match schemaVersion ${FILE_SCHEMA_VERSION}`);
  }

  return (parsed as { events: LifeEvent[] }).events;
}
