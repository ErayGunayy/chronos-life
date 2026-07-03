import 'server-only';

import path from 'node:path';

import { JsonFileLifeEventRepository } from '@/data/json-file-life-event-repository';
import type { LifeEventRepository } from '@/data/life-event-repository';

const DATA_FILE = path.join(process.cwd(), '.chronos-data', 'life-events.json');

type GlobalWithRepository = typeof globalThis & {
  __chronosRepository?: LifeEventRepository;
};

/**
 * Runtime repository. File-backed locally (survives dev-server restarts and
 * HMR via the globalThis cache); swaps to the Supabase implementation once a
 * project is provisioned and SUPABASE_URL is configured (CLAUDE.md §8).
 */
export function getRepository(): LifeEventRepository {
  const globalRef = globalThis as GlobalWithRepository;
  globalRef.__chronosRepository ??= new JsonFileLifeEventRepository(DATA_FILE);
  return globalRef.__chronosRepository;
}
