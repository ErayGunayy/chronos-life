import type { LifeEvent } from '@/domain/life-event/types';

/**
 * Gap detection — the core of Forgotten Moments (CLAUDE.md §6.3).
 *
 * Gaps are computed, never stored (§8): they are derived on the fly from the
 * ordered events of a day, so the timeline can never drift out of sync. Gaps
 * exist only *between* recorded events — nothing before the first or after
 * the last event of a day is ever flagged (unnarrated sleep is not a gap).
 */

export const FORGOTTEN_MOMENT_THRESHOLD_MINUTES = 60;

const MS_PER_MINUTE = 60_000;

/**
 * 'routine'          — under an hour: transitions, small errands. Gray,
 *                      silent, never questioned (§6.3).
 * 'forgotten-moment' — an hour or more: rendered as a question-mark segment,
 *                      inviting (never accusing) a fill-in (§6.3–§6.5).
 */
export type GapKind = 'routine' | 'forgotten-moment';

export interface Gap {
  readonly startAt: string;
  readonly endAt: string;
  readonly durationMinutes: number;
  readonly kind: GapKind;
}

export type TimelineSegment =
  | { readonly type: 'event'; readonly event: LifeEvent }
  | { readonly type: 'gap'; readonly gap: Gap };

/**
 * Events and gaps interleaved chronologically. Overlapping or contained
 * events never reopen already-covered time: a gap starts where the rolling
 * coverage of everything told so far ends.
 */
export function buildDayTimeline(events: readonly LifeEvent[]): TimelineSegment[] {
  const sorted = [...events].sort(
    (a, b) => Date.parse(a.startAt) - Date.parse(b.startAt) || a.id.localeCompare(b.id),
  );

  const segments: TimelineSegment[] = [];
  let coveredUntilMs = Number.NEGATIVE_INFINITY;
  let coveredUntilIso = '';

  for (const event of sorted) {
    const startMs = Date.parse(event.startAt);
    if (segments.length > 0 && startMs > coveredUntilMs) {
      segments.push({
        type: 'gap',
        gap: classifyGap(coveredUntilIso, event.startAt, startMs - coveredUntilMs),
      });
    }
    segments.push({ type: 'event', event });

    const endMs = Date.parse(event.endAt);
    if (endMs > coveredUntilMs) {
      coveredUntilMs = endMs;
      coveredUntilIso = event.endAt;
    }
  }

  return segments;
}

export function detectGaps(events: readonly LifeEvent[]): Gap[] {
  return buildDayTimeline(events)
    .filter((segment): segment is Extract<TimelineSegment, { type: 'gap' }> => segment.type === 'gap')
    .map((segment) => segment.gap);
}

/**
 * Memory coverage of the day's story span — the "Remembered %" (§5.2).
 * Communicates coverage only, never quality: an unremembered record extends
 * the span (the time was accounted for) but does not count as remembered.
 * Null when there is nothing to measure — an empty day is not 0%.
 */
export function rememberedShare(events: readonly LifeEvent[]): number | null {
  if (events.length === 0) return null;

  let spanStartMs = Number.POSITIVE_INFINITY;
  let spanEndMs = Number.NEGATIVE_INFINITY;
  const remembered: Array<{ startMs: number; endMs: number }> = [];

  for (const event of events) {
    const startMs = Date.parse(event.startAt);
    const endMs = Date.parse(event.endAt);
    spanStartMs = Math.min(spanStartMs, startMs);
    spanEndMs = Math.max(spanEndMs, endMs);
    if (event.kind === 'substantive') {
      remembered.push({ startMs, endMs });
    }
  }

  const spanMs = spanEndMs - spanStartMs;
  return mergedDurationMs(remembered) / spanMs;
}

function classifyGap(startAt: string, endAt: string, durationMs: number): Gap {
  const durationMinutes = durationMs / MS_PER_MINUTE;
  return {
    startAt,
    endAt,
    durationMinutes,
    kind: durationMinutes >= FORGOTTEN_MOMENT_THRESHOLD_MINUTES ? 'forgotten-moment' : 'routine',
  };
}

/** Total covered time of possibly-overlapping intervals (shared by ring math). */
export function mergedDurationMs(intervals: Array<{ startMs: number; endMs: number }>): number {
  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs);
  let total = 0;
  let activeStart = Number.NaN;
  let activeEnd = Number.NaN;

  for (const { startMs, endMs } of sorted) {
    if (Number.isNaN(activeStart)) {
      activeStart = startMs;
      activeEnd = endMs;
    } else if (startMs > activeEnd) {
      total += activeEnd - activeStart;
      activeStart = startMs;
      activeEnd = endMs;
    } else {
      activeEnd = Math.max(activeEnd, endMs);
    }
  }
  if (!Number.isNaN(activeStart)) {
    total += activeEnd - activeStart;
  }
  return total;
}
