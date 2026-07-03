/**
 * Life Chapters (CLAUDE.md §5.7): eras discovered from sustained patterns,
 * never manually-created folders. Only user-accepted chapters are records —
 * suggestions are computed on the fly and never stored (§5.7.1).
 */

export type ChapterThemeKind = 'category' | 'place' | 'person';

/** The sustained signal a chapter is built around (§5.7 discovery signals). */
export interface ChapterTheme {
  readonly kind: ChapterThemeKind;
  readonly value: string;
}

export type ChapterStatus = 'active' | 'closed';

/**
 * A chapter the user explicitly accepted. Dates are local calendar days
 * (YYYY-MM-DD) — chapters describe eras of a lived life, not UTC instants.
 * Every date stays user-editable (§5.7.2: AI-derived dates are correctable).
 */
export interface ChapterRecord {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly theme: ChapterTheme;
  readonly startDate: string;
  readonly endDate: string | null;
  readonly status: ChapterStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Identity of a suggestion — used to remember dismissals so the same theme
 * is not re-suggested after the user said "not now".
 */
export function chapterThemeKey(theme: ChapterTheme): string {
  return `${theme.kind}:${theme.value.trim().toLowerCase()}`;
}
