/**
 * The tone guardrail (CLAUDE.md §5.5 rule 3, §6.6): guilt vocabulary is
 * banned in every piece of user-facing copy involving time, gaps, or
 * reflection. Copy modules run their strings through this at module load /
 * build time so a judgmental line can never quietly ship.
 */

export const JUDGMENT_VOCABULARY = ['wasted', 'failed', 'lazy', 'disappointing'] as const;

const JUDGMENT_PATTERN = new RegExp(`\\b(${JUDGMENT_VOCABULARY.join('|')})\\b`, 'i');

/** The first banned word found (lowercased), or null when the copy is calm. */
export function findJudgmentWord(text: string): string | null {
  const match = JUDGMENT_PATTERN.exec(text);
  return match ? match[1].toLowerCase() : null;
}

/** Returns the text unchanged, or throws naming the banned word it contains. */
export function assertCalmCopy(text: string): string {
  const word = findJudgmentWord(text);
  if (word) {
    throw new Error(`judgment vocabulary in copy (banned by §5.5): "${word}"`);
  }
  return text;
}
