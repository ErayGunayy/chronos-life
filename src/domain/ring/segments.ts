import type { LifeEvent } from '@/domain/life-event/types';
import { detectGaps, mergedDurationMs } from '@/domain/timeline/gaps';
import { colorForCategoryIndex } from '@/domain/ring/palette';

/**
 * Living Ring segment math (CLAUDE.md §5.2.1–§5.2.4). Pure computation over
 * LifeEvents — the ring stores nothing of its own and can never drift out of
 * sync with the timeline (§5.2).
 *
 * - one segment per category (fixed color, §5.2.3), largest → smallest;
 * - each event without a category becomes its own titled wedge, so nothing you
 *   record hides inside a single anonymous blob;
 * - routine (<1h) pauses collapse into one silent dark-neutral segment;
 * - unremembered records collapse into one static dashed segment — answered,
 *   so they never breathe;
 * - forgotten moments: one breathing segment per gap on a single day (each is
 *   individually fillable, §5.2.2); one combined segment across a period
 *   (§5.2.4) since a single question would not make sense there.
 *
 * On the Today view the circle is the full 24h day (§5.2 / §5.8.4): whatever
 * the story doesn't cover becomes one calm "unaccounted" wedge (the night, the
 * hours not yet told) — an open invitation, never a judgment, and only once
 * something has been told (an empty day stays an empty ring). Aggregate periods
 * (week/month/year) omit that wedge and the circle is just the accounted time.
 * Ordering is dynamic and position is not sacred — recognizability is carried
 * by color, never by position (§5.2.3).
 */

const MS_PER_MINUTE = 60_000;
/** Below this the leftover is rounding noise, not a real gap worth a wedge. */
const MIN_UNACCOUNTED_MINUTES = 1;

export interface RingDayInput {
  readonly localDate: string;
  /** UTC bounds of the local day; events crossing midnight are clamped so a period never double-counts them. */
  readonly fromUtc: string;
  readonly toUtc: string;
  readonly events: readonly LifeEvent[];
}

export interface ForgottenSlice {
  readonly localDate: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly durationMinutes: number;
}

interface RingSegmentBase {
  readonly durationMinutes: number;
  /** 0..1 — this segment's share of the ring. */
  readonly share: number;
}

export type RingSegment =
  | (RingSegmentBase & {
      readonly kind: 'category';
      readonly category: string;
      readonly color: string;
    })
  | (RingSegmentBase & { readonly kind: 'uncategorized'; readonly title: string })
  | (RingSegmentBase & { readonly kind: 'routine-gap' })
  | (RingSegmentBase & { readonly kind: 'unremembered' })
  | (RingSegmentBase & { readonly kind: 'unaccounted' })
  | (RingSegmentBase & { readonly kind: 'forgotten'; readonly slices: readonly ForgottenSlice[] });

export interface RingView {
  /** Sorted largest → smallest; rendered clockwise from 12 o'clock (§5.2.3). */
  readonly segments: readonly RingSegment[];
  readonly totalMinutes: number;
}

export function buildRingSegments(
  days: readonly RingDayInput[],
  categoryColors: Readonly<Record<string, number>>,
): RingView {
  const categoryIntervalsByDay = new Map<string, Array<{ startMs: number; endMs: number }>>();
  const uncategorizedEvents: Array<{ title: string; minutes: number }> = [];
  const unremembered: number[] = [];
  let routineMinutes = 0;
  const forgottenSlices: ForgottenSlice[] = [];
  // Sum of each day's real bounds — 24h/day, but DST-correct via the bounds.
  let periodTotalMinutes = 0;

  for (const day of days) {
    const fromMs = Date.parse(day.fromUtc);
    const toMs = Date.parse(day.toUtc);
    periodTotalMinutes += (toMs - fromMs) / MS_PER_MINUTE;

    for (const event of day.events) {
      const clamped = clampToRange(event.startAt, event.endAt, fromMs, toMs);
      if (!clamped) continue;

      if (event.kind === 'unremembered') {
        unremembered.push(clamped.endMs - clamped.startMs);
        continue;
      }
      const category = event.category?.trim();
      if (!category) {
        uncategorizedEvents.push({
          title: event.title,
          minutes: (clamped.endMs - clamped.startMs) / MS_PER_MINUTE,
        });
        continue;
      }
      const key = `${day.localDate} ${category}`;
      const intervals = categoryIntervalsByDay.get(key) ?? [];
      intervals.push(clamped);
      categoryIntervalsByDay.set(key, intervals);
    }

    for (const gap of detectGaps(day.events)) {
      if (gap.kind === 'routine') {
        routineMinutes += gap.durationMinutes;
      } else {
        forgottenSlices.push({
          localDate: day.localDate,
          startAt: gap.startAt,
          endAt: gap.endAt,
          durationMinutes: gap.durationMinutes,
        });
      }
    }
  }

  // Same-category overlaps within a day merge instead of double-counting.
  const categoryMinutes = new Map<string, number>();
  for (const [key, intervals] of categoryIntervalsByDay) {
    const category = key.slice(key.indexOf(' ') + 1);
    const minutes = mergedDurationMs(intervals) / MS_PER_MINUTE;
    categoryMinutes.set(category, (categoryMinutes.get(category) ?? 0) + minutes);
  }

  const segments: RingSegment[] = [];

  for (const [category, minutes] of categoryMinutes) {
    if (minutes <= 0) continue;
    const paletteIndex = categoryColors[category];
    segments.push({
      kind: 'category',
      category,
      color: colorForCategoryIndex(paletteIndex ?? 0),
      durationMinutes: minutes,
      share: 0,
    });
  }

  // Each uncategorized event on its own, titled — so a thing you recorded is
  // never hidden inside a single anonymous "uncategorized" blob (§5.2.3).
  for (const { title, minutes } of uncategorizedEvents) {
    if (minutes > 0) {
      segments.push({ kind: 'uncategorized', title, durationMinutes: minutes, share: 0 });
    }
  }

  const unrememberedMinutes = sumMs(unremembered) / MS_PER_MINUTE;
  if (unrememberedMinutes > 0) {
    segments.push({ kind: 'unremembered', durationMinutes: unrememberedMinutes, share: 0 });
  }

  if (routineMinutes > 0) {
    segments.push({ kind: 'routine-gap', durationMinutes: routineMinutes, share: 0 });
  }

  if (forgottenSlices.length > 0) {
    if (days.length === 1) {
      // Today view: each forgotten moment is its own tappable, breathing arc (§5.2.2).
      for (const slice of forgottenSlices) {
        segments.push({
          kind: 'forgotten',
          slices: [slice],
          durationMinutes: slice.durationMinutes,
          share: 0,
        });
      }
    } else {
      // Period view: one combined segment for the total unaccounted duration (§5.2.4).
      const sorted = [...forgottenSlices].sort(
        (a, b) => a.startAt.localeCompare(b.startAt) || a.endAt.localeCompare(b.endAt),
      );
      segments.push({
        kind: 'forgotten',
        slices: sorted,
        durationMinutes: sorted.reduce((sum, slice) => sum + slice.durationMinutes, 0),
        share: 0,
      });
    }
  }

  // The 24h ring: whatever the today story doesn't cover becomes one calm
  // wedge. Only for the single-day (Today) view, and only once something was
  // told — an empty day keeps its gentle empty ring. Aggregate periods
  // (week/month/year) omit it: a multi-day remainder is huge, swamps the ring,
  // and says nothing useful (§5.2.4).
  if (days.length === 1 && segments.length > 0) {
    const accountedMinutes = segments.reduce((sum, segment) => sum + segment.durationMinutes, 0);
    const remainder = periodTotalMinutes - accountedMinutes;
    if (remainder >= MIN_UNACCOUNTED_MINUTES) {
      segments.push({ kind: 'unaccounted', durationMinutes: remainder, share: 0 });
    }
  }

  const totalMinutes = segments.reduce((sum, segment) => sum + segment.durationMinutes, 0);
  const withShares = segments.map((segment) => ({
    ...segment,
    share: totalMinutes > 0 ? segment.durationMinutes / totalMinutes : 0,
  }));

  withShares.sort(
    (a, b) => b.durationMinutes - a.durationMinutes || segmentLabel(a).localeCompare(segmentLabel(b)),
  );

  return { segments: withShares, totalMinutes };
}

function segmentLabel(segment: RingSegment): string {
  return segment.kind === 'category' ? `category:${segment.category}` : segment.kind;
}

function clampToRange(
  startAt: string,
  endAt: string,
  fromMs: number,
  toMs: number,
): { startMs: number; endMs: number } | null {
  const startMs = Math.max(Date.parse(startAt), fromMs);
  const endMs = Math.min(Date.parse(endAt), toMs);
  return endMs > startMs ? { startMs, endMs } : null;
}

function sumMs(durations: readonly number[]): number {
  return durations.reduce((sum, duration) => sum + duration, 0);
}
