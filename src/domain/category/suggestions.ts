/**
 * Category suggestions for the review step (§5.2). Categories are free-form
 * everywhere (AI schema, stub, review) — these presets are a UX convenience so
 * the user can click instead of retyping, never a constraint. The list is the
 * user's own used categories first (durable, already color-assigned), then a
 * default seed for anyone who hasn't built up their own yet.
 */

/**
 * Turkish seed shown before the user has categories of their own — matches the
 * language the AI extractor produces (categories are kept in the narrator's
 * language), so a fresh list reads consistently with what capture generates.
 */
export const DEFAULT_CATEGORIES: readonly string[] = [
  'İş',
  'Öğrenme',
  'Sağlık',
  'Aile',
  'Sosyal',
  'Dinlenme',
  'Ev',
  'Spor',
];

export interface CategorySuggestion {
  readonly name: string;
  /** Assigned palette index when the category already has a ring color; null otherwise. */
  readonly colorIndex: number | null;
}

/**
 * The user's known categories first (from their persisted color assignments,
 * ordered by palette index so the list matches the order the ring learned
 * them), then any default seeds not already known. Deduped by name.
 */
export function buildCategorySuggestions(
  categoryColors: Readonly<Record<string, number>>,
): CategorySuggestion[] {
  const known: CategorySuggestion[] = Object.entries(categoryColors)
    .sort((a, b) => a[1] - b[1])
    .map(([name, colorIndex]) => ({ name, colorIndex }));

  const knownNames = new Set(known.map((suggestion) => suggestion.name));

  const defaults: CategorySuggestion[] = DEFAULT_CATEGORIES.filter(
    (name) => !knownNames.has(name),
  ).map((name) => ({ name, colorIndex: null }));

  return [...known, ...defaults];
}
