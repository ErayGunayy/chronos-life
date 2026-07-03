import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { InMemoryLifeEventRepository } from '@/data/in-memory-life-event-repository';
import type { LifeEventRepository } from '@/data/life-event-repository';
import type { LifeEvent } from '@/domain/life-event/types';

const FILE_SCHEMA_VERSION = 1;

/**
 * File-backed repository for local dev until Supabase is provisioned
 * (CLAUDE.md §8). Durability rules follow §5.11: writes are atomic
 * (tmp + rename), and an unreadable file throws loudly — this code will
 * never silently reset someone's personal history.
 */
export class JsonFileLifeEventRepository implements LifeEventRepository {
  private inner: InMemoryLifeEventRepository | null = null;

  constructor(private readonly filePath: string) {}

  async save(event: LifeEvent): Promise<void> {
    const inner = await this.ensureLoaded();
    await inner.save(event);
    await this.persist(inner);
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
    const inner = await this.ensureLoaded();
    const removed = await inner.deleteById(userId, id);
    if (removed) await this.persist(inner);
    return removed;
  }

  async deleteAll(userId: string): Promise<number> {
    const inner = await this.ensureLoaded();
    const removed = await inner.deleteAll(userId);
    if (removed > 0) await this.persist(inner);
    return removed;
  }

  private async ensureLoaded(): Promise<InMemoryLifeEventRepository> {
    if (this.inner) return this.inner;

    const inner = new InMemoryLifeEventRepository();
    let raw: string | null = null;
    try {
      raw = await readFile(this.filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    if (raw !== null) {
      const parsed = parseStoreFile(raw, this.filePath);
      for (const event of parsed) {
        await inner.save(event);
      }
    }

    this.inner = inner;
    return inner;
  }

  private async persist(inner: InMemoryLifeEventRepository): Promise<void> {
    const payload = JSON.stringify(
      { schemaVersion: FILE_SCHEMA_VERSION, events: inner.snapshot() },
      null,
      2,
    );
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    await writeFile(tmpPath, payload, 'utf8');
    await rename(tmpPath, this.filePath);
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
