import type { LifeEvent } from '@/domain/life-event/types';

/**
 * Persistence boundary for facts (CLAUDE.md §5.12). Implementations must treat
 * memories with the rigor of source code (§5.11): deletion is real deletion,
 * and nothing is ever silently rewritten.
 */
export interface LifeEventRepository {
  /** Insert, or replace an existing memory with the same id. */
  save(event: LifeEvent): Promise<void>;

  getById(userId: string, id: string): Promise<LifeEvent | null>;

  /**
   * Events overlapping the half-open range [fromUtc, toUtc), sorted by
   * startAt then id. Overlap (not containment) so a memory crossing midnight
   * belongs to both days it touches.
   */
  listBetween(userId: string, fromUtc: string, toUtc: string): Promise<LifeEvent[]>;

  /** Every memory the user owns, sorted by startAt then id — powers export. */
  listAll(userId: string): Promise<LifeEvent[]>;

  /** Hard delete. Returns whether the memory existed. */
  deleteById(userId: string, id: string): Promise<boolean>;

  /** Hard delete of everything the user owns. Returns how many were removed. */
  deleteAll(userId: string): Promise<number>;
}
