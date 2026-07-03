import 'server-only';

import path from 'node:path';

import { JsonFileUserStateRepository } from '@/data/json-file-user-state-repository';
import type { UserStateRepository } from '@/data/user-state-repository';

const STATE_FILE = path.join(process.cwd(), '.chronos-data', 'user-state.json');

type GlobalWithStateRepository = typeof globalThis & {
  __chronosStateRepository?: UserStateRepository;
};

/**
 * Runtime user-state store. File-backed locally (same lifecycle as the
 * life-event repository); swaps to a Supabase implementation alongside it
 * once provisioning happens (CLAUDE.md §8).
 */
export function getStateRepository(): UserStateRepository {
  const globalRef = globalThis as GlobalWithStateRepository;
  globalRef.__chronosStateRepository ??= new JsonFileUserStateRepository(STATE_FILE);
  return globalRef.__chronosStateRepository;
}
