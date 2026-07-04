import { assertCalmCopy } from '@/domain/reflection/tone';

/**
 * Copy for the ring's forgotten-moment interactions (CLAUDE.md §5.2.2,
 * §5.2.4). Every string passes the tone guardrail: inviting, never accusing,
 * and "I don't remember" is always a complete answer (§6.4).
 */

/** The micro-dialog question when a breathing segment is tapped (§5.2.2). */
export function gapFillQuestion(startLabel: string, endLabel: string): string {
  return assertCalmCopy(`Where did ${startLabel}–${endLabel} take you?`);
}

/** Sub-line under the question — control stays with the user. */
export function gapFillHint(): string {
  return assertCalmCopy(
    'Tell it in your own words — or leave it for later, that is always fine.',
  );
}

/** Heading for the aggregate forgotten segment's day list (§5.2.4). */
export function aggregateForgottenLead(sliceCount: number): string {
  const copy =
    sliceCount === 1
      ? 'One stretch of this period is still unwritten.'
      : `${sliceCount} stretches of this period are still unwritten.`;
  return assertCalmCopy(copy);
}
