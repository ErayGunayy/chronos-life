import { assertCalmCopy } from '@/domain/reflection/tone';
import type { Gap } from '@/domain/timeline/gaps';
import { localTimeOf } from '@/lib/time/format';

/**
 * The single bundled invitation (CLAUDE.md §6.4): never gap-by-gap
 * interrogation. All Forgotten Moments of a day become one gentle message,
 * ordered longest gap first, and control stays with the user — fill it,
 * ask for help, leave it, or say "I don't remember".
 */

export interface InviteMoment {
  readonly startAt: string;
  readonly endAt: string;
  readonly startLabel: string;
  readonly endLabel: string;
  readonly durationMinutes: number;
}

export interface ForgottenMomentsInvite {
  readonly message: string;
  /** Longest first (§6.4). */
  readonly moments: readonly InviteMoment[];
}

export function buildForgottenMomentsInvite(
  gaps: readonly Gap[],
  timezone: string,
): ForgottenMomentsInvite | null {
  const moments = gaps
    .filter((gap) => gap.kind === 'forgotten-moment')
    .map((gap) => ({
      startAt: gap.startAt,
      endAt: gap.endAt,
      startLabel: localTimeOf(gap.startAt, timezone),
      endLabel: localTimeOf(gap.endAt, timezone),
      durationMinutes: gap.durationMinutes,
    }))
    .sort(
      (a, b) =>
        b.durationMinutes - a.durationMinutes || a.startAt.localeCompare(b.startAt),
    );

  if (moments.length === 0) return null;

  const ranges = moments.map((moment) => `${moment.startLabel}–${moment.endLabel}`);
  const message =
    moments.length === 1
      ? `I didn't catch what happened between ${ranges[0]}. Want to fill it in now, or come back to it later?`
      : `I didn't catch what happened between ${listRanges(ranges)}. Want to fill one in now, or come back to them later?`;

  return { message: assertCalmCopy(message), moments };
}

function listRanges(ranges: readonly string[]): string {
  if (ranges.length === 2) return `${ranges[0]} or ${ranges[1]}`;
  return `${ranges.slice(0, -1).join(', ')}, or ${ranges[ranges.length - 1]}`;
}
