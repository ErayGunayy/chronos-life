import type { LifeEvent } from '@/domain/life-event/types';

/**
 * Category → palette-index assignment (CLAUDE.md §5.2.3): colors are given in
 * creation order and, once assigned, never change — position on the ring
 * shifts day to day, so color is what carries recognizability.
 *
 * Assignments live in the user-state store; this module only computes what a
 * given set of events implies. Deleting events never revokes an assignment.
 */

export interface ColorAssignmentResult {
  /** Full mapping after assignment (existing entries always preserved). */
  readonly assignments: Readonly<Record<string, number>>;
  /** Categories that were newly assigned by this call, in assignment order. */
  readonly added: readonly string[];
}

/**
 * Categories in first-seen order: the moment a category first entered the
 * user's story (by the memory's creation time) defines its creation order,
 * deterministically.
 */
export function categoriesInFirstSeenOrder(events: readonly LifeEvent[]): string[] {
  const sorted = [...events].sort(
    (a, b) =>
      Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
      Date.parse(a.startAt) - Date.parse(b.startAt) ||
      a.id.localeCompare(b.id),
  );
  const seen = new Set<string>();
  for (const event of sorted) {
    const category = event.category?.trim();
    if (category) seen.add(category);
  }
  return [...seen];
}

/** Assigns the next free palette indexes to categories not yet in the map. */
export function assignCategoryColors(
  existing: Readonly<Record<string, number>>,
  categories: readonly string[],
): ColorAssignmentResult {
  const assignments: Record<string, number> = { ...existing };
  const added: string[] = [];
  let nextIndex = Object.values(existing).reduce((max, index) => Math.max(max, index + 1), 0);

  for (const category of categories) {
    if (category in assignments) continue;
    assignments[category] = nextIndex;
    nextIndex += 1;
    added.push(category);
  }

  return { assignments, added };
}
