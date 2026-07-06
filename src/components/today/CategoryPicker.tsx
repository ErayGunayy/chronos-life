'use client';

import { useState } from 'react';

import type { CategorySuggestion } from '@/domain/category/suggestions';
import { colorForCategoryIndex } from '@/domain/ring/palette';

type Props = {
  /** Currently selected category name, or '' for none. */
  selected: string;
  suggestions: readonly CategorySuggestion[];
  /** '' clears the selection — category stays optional. */
  onSelect: (name: string) => void;
  /** A new, user-typed category — the parent adds it to the shared list and selects it. */
  onCreate: (name: string) => void;
};

/**
 * Preset category chips for the review step (§5.2): click to pick instead of
 * typing, with "+ Yeni" to add one. Chips echo the ring's colors for known
 * categories. Selecting is a deliberate human choice — the caller records that
 * as full confidence.
 */
export function CategoryPicker({ selected, suggestions, onSelect, onCreate }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const commitNew = () => {
    const name = draft.trim();
    setDraft('');
    setIsAdding(false);
    if (name !== '') onCreate(name);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {suggestions.map((suggestion) => {
        const isSelected = suggestion.name === selected;
        return (
          <button
            key={suggestion.name}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(isSelected ? '' : suggestion.name)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              isSelected
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line bg-card text-foreground hover:border-accent'
            }`}
          >
            {suggestion.colorIndex !== null && (
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: colorForCategoryIndex(suggestion.colorIndex) }}
              />
            )}
            {suggestion.name}
          </button>
        );
      })}

      {isAdding ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitNew}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitNew();
            } else if (event.key === 'Escape') {
              setDraft('');
              setIsAdding(false);
            }
          }}
          placeholder="Yeni kategori"
          aria-label="New category name"
          className="w-32 rounded-full border border-accent bg-card px-2.5 py-1 text-xs text-foreground focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          + Yeni
        </button>
      )}
    </div>
  );
}
