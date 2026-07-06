import { describe, expect, it } from 'vitest';

import { buildCategorySuggestions, DEFAULT_CATEGORIES } from '@/domain/category/suggestions';

describe('buildCategorySuggestions', () => {
  it('returns all defaults, uncolored, when the user has no categories yet', () => {
    const suggestions = buildCategorySuggestions({});

    expect(suggestions.map((suggestion) => suggestion.name)).toEqual([...DEFAULT_CATEGORIES]);
    expect(suggestions.every((suggestion) => suggestion.colorIndex === null)).toBe(true);
  });

  it('lists known categories first, ordered by palette index, then the defaults', () => {
    const suggestions = buildCategorySuggestions({ Kitap: 1, Proje: 0 });

    expect(suggestions.slice(0, 2)).toEqual([
      { name: 'Proje', colorIndex: 0 },
      { name: 'Kitap', colorIndex: 1 },
    ]);
    expect(suggestions.slice(2).map((suggestion) => suggestion.name)).toEqual([
      ...DEFAULT_CATEGORIES,
    ]);
  });

  it('does not duplicate a default that is already a known category', () => {
    const suggestions = buildCategorySuggestions({ Spor: 0 });

    expect(suggestions.filter((suggestion) => suggestion.name === 'Spor')).toHaveLength(1);
    expect(suggestions[0]).toEqual({ name: 'Spor', colorIndex: 0 });
  });
});
