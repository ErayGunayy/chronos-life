import type { LifeEvent } from '@/domain/life-event/types';
import {
  buildDayTimeline,
  clampToRange,
  detectGaps,
  mergedDurationMs,
  type Gap,
} from '@/domain/timeline/gaps';
import { colorForCategoryIndex } from '@/domain/ring/palette';

/**
 * Living Ring segment math (CLAUDE.md §5.2.1–§5.2.4). Pure computation over
 * LifeEvents — the ring stores nothing of its own and can never drift out of
 * sync with the timeline (§5.2).
 *
 * Two layouts, chosen by scale:
 *
 * - **Clock (single day, `buildDayClock`).** The ring is a literal 24h clock:
 *   00:00 at the top (12 o'clock), time running clockwise to 23:59. Every event
 *   and gap sits at its *real* position in the day, so nothing is merged or
 *   reordered — the biggest thing is wherever it happened, not floated to the
 *   front. Un-narrated edges (the night, hours not yet told) become calm
 *   "unaccounted" wedges at their true position. Forgotten Moments stay one
 *   tappable breathing arc each (§5.2.2).
 * - **Aggregate (week/month/year, `buildRingSegments`).** A clock makes no sense
 *   across many days, so here segments are one-per-category, summed and ordered
 *   largest → smallest (§5.2.4); Forgotten Moments across the period combine
 *   into one arc; there is no 24h remainder wedge (it would swamp the ring).
 *
 * In both layouts recognizability is carried by fixed per-category color
 * (§5.2.3), never by position.
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
  /**
   * Clock layout only (§5.2): this band's absolute position on the 24h circle,
   * as fractions of the day in [0, 1] where 0 = local midnight at 12 o'clock.
   * Undefined on the aggregate (period) layout, whose arcs are packed by size.
   */
  readonly startFraction?: number;
  readonly endFraction?: number;
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

export type RingLayout = 'clock' | 'aggregate';

export interface RingView {
  readonly segments: readonly RingSegment[];
  /** 'clock' = single-day 24h positions; 'aggregate' = period pie (§5.2.4). */
  readonly layout: RingLayout;
  readonly totalMinutes: number;
}

/**
 * The single-day 24h clock (§5.2). Walks the day's chronological event/gap
 * timeline and gives every band its true position on the circle. Overlapping
 * or contained events never reopen already-covered time (a band is clipped to
 * start no earlier than the previous band ends), so the whole day tiles cleanly
 * from 00:00 to 24:00 with no gaps or double-counting.
 */
export function buildDayClock(
  day: RingDayInput,
  categoryColors: Readonly<Record<string, number>>,
): RingView {
  const fromMs = Date.parse(day.fromUtc);
  const toMs = Date.parse(day.toUtc);
  const spanMs = toMs - fromMs;
  if (!(spanMs > 0) || day.events.length === 0) {
    return { segments: [], layout: 'clock', totalMinutes: 0 };
  }

  // Positioned, non-overlapping bands in chronological order. `cursorMs` is the
  // running coverage end, so a contained event clips to zero width and drops.
  const bands: Array<{ segment: RingSegment; startMs: number; endMs: number }> = [];
  let cursorMs = fromMs;

  for (const item of buildDayTimeline(day.events)) {
    const rawStart = item.type === 'event' ? item.event.startAt : item.gap.startAt;
    const rawEnd = item.type === 'event' ? item.event.endAt : item.gap.endAt;
    const startMs = Math.max(Date.parse(rawStart), cursorMs, fromMs);
    const endMs = Math.min(Date.parse(rawEnd), toMs);
    if (endMs <= startMs) continue;

    const segment =
      item.type === 'event'
        ? eventBand(item.event, startMs, endMs, categoryColors)
        : gapBand(item.gap, day.localDate, startMs, endMs);
    bands.push({ segment, startMs, endMs });
    cursorMs = endMs;
  }

  if (bands.length === 0) {
    return { segments: [], layout: 'clock', totalMinutes: 0 };
  }

  // The un-narrated night/edges become their own calm wedges at their real
  // clock position — an open invitation, never a judgment (§5.2 / §5.8.4).
  const leadMs = bands[0].startMs - fromMs;
  if (leadMs >= MIN_UNACCOUNTED_MINUTES * MS_PER_MINUTE) {
    bands.unshift({
      segment: unaccountedBand(fromMs, bands[0].startMs),
      startMs: fromMs,
      endMs: bands[0].startMs,
    });
  }
  const lastEndMs = bands[bands.length - 1].endMs;
  if (toMs - lastEndMs >= MIN_UNACCOUNTED_MINUTES * MS_PER_MINUTE) {
    bands.push({ segment: unaccountedBand(lastEndMs, toMs), startMs: lastEndMs, endMs: toMs });
  }

  const segments = bands.map(({ segment, startMs, endMs }) => ({
    ...segment,
    share: segment.durationMinutes / (spanMs / MS_PER_MINUTE),
    startFraction: (startMs - fromMs) / spanMs,
    endFraction: (endMs - fromMs) / spanMs,
  }));

  return { segments, layout: 'clock', totalMinutes: spanMs / MS_PER_MINUTE };
}

function eventBand(
  event: LifeEvent,
  startMs: number,
  endMs: number,
  categoryColors: Readonly<Record<string, number>>,
): RingSegment {
  const base = { durationMinutes: (endMs - startMs) / MS_PER_MINUTE, share: 0 };
  if (event.kind === 'unremembered') {
    return { ...base, kind: 'unremembered' };
  }
  const category = event.category?.trim();
  if (!category) {
    return { ...base, kind: 'uncategorized', title: event.title };
  }
  return { ...base, kind: 'category', category, color: colorForCategoryIndex(categoryColors[category] ?? 0) };
}

function gapBand(gap: Gap, localDate: string, startMs: number, endMs: number): RingSegment {
  const base = { durationMinutes: (endMs - startMs) / MS_PER_MINUTE, share: 0 };
  if (gap.kind === 'routine') {
    return { ...base, kind: 'routine-gap' };
  }
  // One tappable Forgotten Moment per gap (§5.2.2). The slice keeps the gap's
  // real bounds so filling it in targets the right time, even if the band was
  // clipped to the day edge for rendering.
  return {
    ...base,
    kind: 'forgotten',
    slices: [{ localDate, startAt: gap.startAt, endAt: gap.endAt, durationMinutes: gap.durationMinutes }],
  };
}

function unaccountedBand(startMs: number, endMs: number): RingSegment {
  return { durationMinutes: (endMs - startMs) / MS_PER_MINUTE, share: 0, kind: 'unaccounted' };
}

/**
 * The aggregate (period) ring for week/month/year (§5.2.4): one segment per
 * category, summed across the window and ordered largest → smallest, with all
 * Forgotten Moments combined into a single arc. No 24h remainder wedge — a
 * multi-day remainder is huge and says nothing useful.
 */
export function buildRingSegments(
  days: readonly RingDayInput[],
  categoryColors: Readonly<Record<string, number>>,
): RingView {
  const categoryIntervalsByDay = new Map<string, Array<{ startMs: number; endMs: number }>>();
  const uncategorizedEvents: Array<{ title: string; minutes: number }> = [];
  const unremembered: number[] = [];
  let routineMinutes = 0;
  const forgottenSlices: ForgottenSlice[] = [];

  for (const day of days) {
    const fromMs = Date.parse(day.fromUtc);
    const toMs = Date.parse(day.toUtc);

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

  const totalMinutes = segments.reduce((sum, segment) => sum + segment.durationMinutes, 0);
  const withShares = segments.map((segment) => ({
    ...segment,
    share: totalMinutes > 0 ? segment.durationMinutes / totalMinutes : 0,
  }));

  withShares.sort(
    (a, b) => b.durationMinutes - a.durationMinutes || segmentLabel(a).localeCompare(segmentLabel(b)),
  );

  return { segments: withShares, layout: 'aggregate', totalMinutes };
}

function segmentLabel(segment: RingSegment): string {
  return segment.kind === 'category' ? `category:${segment.category}` : segment.kind;
}

function sumMs(durations: readonly number[]): number {
  return durations.reduce((sum, duration) => sum + duration, 0);
}
