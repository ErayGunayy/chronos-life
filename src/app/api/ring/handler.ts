import type { LifeEventRepository } from '@/data/life-event-repository';
import type { UserStateRepository } from '@/data/user-state-repository';
import type { LifeEvent } from '@/domain/life-event/types';
import { assignCategoryColors, categoriesInFirstSeenOrder } from '@/domain/ring/assign-colors';
import {
  buildDayClock,
  buildRingSegments,
  type RingDayInput,
  type RingLayout,
  type RingSegment,
} from '@/domain/ring/segments';
import { type ApiEnvelope, fail, ok } from '@/lib/api/envelope';
import { addLocalDays, utcInstantOfLocalMidnight } from '@/lib/time/day-bounds';
import { localTimeOf } from '@/lib/time/format';

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const RING_PERIODS = ['today', 'week', 'month', 'year'] as const;
export type RingPeriod = (typeof RING_PERIODS)[number];

/**
 * Trailing windows ending on the requested day — the same "last N days"
 * convention the weekly reflection view already uses, so "week" means the
 * same thing everywhere in the product.
 */
const PERIOD_DAY_COUNT: Record<RingPeriod, number> = {
  today: 1,
  week: 7,
  month: 30,
  year: 365,
};

export interface ForgottenSliceView {
  readonly localDate: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly durationMinutes: number;
  readonly startLabel: string;
  readonly endLabel: string;
}

/**
 * Clock-layout positioning (§5.2): each band's place on the 24h circle plus a
 * human start/end time for the schedule-style legend. Absent on the aggregate
 * (period) layout, whose arcs are packed by size, not time.
 */
interface ClockPosition {
  readonly startFraction?: number;
  readonly endFraction?: number;
  readonly startLabel?: string;
  readonly endLabel?: string;
}

export type RingSegmentView = (
  | {
      readonly kind: 'category';
      readonly category: string;
      readonly color: string;
      readonly durationMinutes: number;
      readonly share: number;
    }
  | {
      readonly kind: 'uncategorized';
      readonly title: string;
      readonly durationMinutes: number;
      readonly share: number;
    }
  | {
      readonly kind: 'routine-gap' | 'unremembered' | 'unaccounted';
      readonly durationMinutes: number;
      readonly share: number;
    }
  | {
      readonly kind: 'forgotten';
      readonly durationMinutes: number;
      readonly share: number;
      readonly slices: readonly ForgottenSliceView[];
    }
) &
  ClockPosition;

export interface RingResponse {
  readonly period: RingPeriod;
  /** 'clock' = single-day 24h positions; 'aggregate' = period pie (§5.2.4). */
  readonly layout: RingLayout;
  /** Local date the window ends on (inclusive) — the "today" anchor. */
  readonly date: string;
  /** Local date the window starts on (inclusive). */
  readonly fromDate: string;
  readonly timezone: string;
  readonly totalMinutes: number;
  /** Minutes of remembered, substantive time (categories + uncategorized events). */
  readonly rememberedMinutes: number;
  readonly segments: readonly RingSegmentView[];
}

/**
 * The Living Ring as data (§5.2): computed entirely from LifeEvents plus the
 * user's fixed category-color assignments (§5.2.3). Widening the period only
 * widens the aggregation window — the logic never changes (§5.2.4).
 */
export async function handleRingRequest(
  query: { date?: string | null; tz?: string | null; period?: string | null },
  events: LifeEventRepository,
  state: UserStateRepository,
  userId: string,
): Promise<{ status: number; body: ApiEnvelope<RingResponse> }> {
  const date = query.date ?? '';
  const timezone = query.tz ?? '';
  const period = (query.period ?? 'today') as RingPeriod;

  if (!LOCAL_DATE_PATTERN.test(date)) {
    return { status: 400, body: fail('date must be YYYY-MM-DD') };
  }
  if (!isValidTimezone(timezone)) {
    return { status: 400, body: fail('tz must be a valid IANA timezone') };
  }
  if (!RING_PERIODS.includes(period)) {
    return { status: 400, body: fail('period must be one of: today, week, month, year') };
  }

  const dayCount = PERIOD_DAY_COUNT[period];
  const fromDate = addLocalDays(date, -(dayCount - 1));

  // One midnight per boundary (shared between adjacent days), one repo fetch
  // for the whole window, then a per-day partition with the same overlap
  // semantics listBetween uses.
  const localDates = Array.from({ length: dayCount }, (_, i) => addLocalDays(fromDate, i));
  const midnights = [...localDates, addLocalDays(date, 1)].map((day) =>
    utcInstantOfLocalMidnight(day, timezone),
  );
  const windowEvents = await events.listBetween(userId, midnights[0], midnights[dayCount]);

  const days: RingDayInput[] = localDates.map((localDate, i) => ({
    localDate,
    fromUtc: midnights[i],
    toUtc: midnights[i + 1],
    events: eventsOverlapping(windowEvents, midnights[i], midnights[i + 1]),
  }));

  const categoryColors = await ensureCategoryColors(state, userId, windowEvents);
  // A single day is a literal 24h clock; wider windows aggregate (§5.2 / §5.2.4).
  const view =
    days.length === 1
      ? buildDayClock(days[0], categoryColors)
      : buildRingSegments(days, categoryColors);

  const dayFromMs = Date.parse(days[0].fromUtc);
  const daySpanMs = Date.parse(days[days.length - 1].toUtc) - dayFromMs;
  const clockLabels = (segment: RingSegment): ClockPosition =>
    view.layout === 'clock' && segment.startFraction !== undefined
      ? {
          startFraction: segment.startFraction,
          endFraction: segment.endFraction,
          startLabel: labelAtFraction(segment.startFraction, dayFromMs, daySpanMs, timezone),
          endLabel: labelAtFraction(segment.endFraction ?? segment.startFraction, dayFromMs, daySpanMs, timezone),
        }
      : {};

  const segments: RingSegmentView[] = view.segments.map((segment) => {
    const position = clockLabels(segment);
    if (segment.kind === 'forgotten') {
      return {
        ...segment,
        ...position,
        slices: segment.slices.map((slice) => ({
          ...slice,
          startLabel: localTimeOf(slice.startAt, timezone),
          endLabel: localTimeOf(slice.endAt, timezone),
        })),
      };
    }
    return { ...segment, ...position };
  });

  return {
    status: 200,
    body: ok({
      period,
      layout: view.layout,
      date,
      fromDate,
      timezone,
      totalMinutes: view.totalMinutes,
      rememberedMinutes: rememberedMinutes(view.segments),
      segments,
    }),
  };
}

/** Local HH:MM at a clock fraction of the day — rounded to the nearest minute. */
function labelAtFraction(fraction: number, fromMs: number, spanMs: number, timezone: string): string {
  const instantMs = Math.round((fromMs + fraction * spanMs) / 60_000) * 60_000;
  return localTimeOf(new Date(instantMs).toISOString(), timezone);
}

/**
 * Categories keep the color they were first given, forever (§5.2.3). New
 * categories get the next free palette index in first-seen order, persisted
 * through the user-state store's atomic update so concurrent requests cannot
 * hand out the same index twice.
 */
async function ensureCategoryColors(
  state: UserStateRepository,
  userId: string,
  windowEvents: readonly LifeEvent[],
): Promise<Readonly<Record<string, number>>> {
  const known = (await state.get(userId)).categoryColors;
  const ordered = categoriesInFirstSeenOrder(windowEvents);
  if (ordered.every((category) => category in known)) return known;

  const updated = await state.update(userId, (current) => ({
    ...current,
    categoryColors: assignCategoryColors(current.categoryColors, ordered).assignments,
  }));
  return updated.categoryColors;
}

function rememberedMinutes(segments: readonly RingSegment[]): number {
  return segments
    .filter((segment) => segment.kind === 'category' || segment.kind === 'uncategorized')
    .reduce((sum, segment) => sum + segment.durationMinutes, 0);
}

function eventsOverlapping(
  windowEvents: readonly LifeEvent[],
  fromUtc: string,
  toUtc: string,
): LifeEvent[] {
  const fromMs = Date.parse(fromUtc);
  const toMs = Date.parse(toUtc);
  return windowEvents.filter(
    (event) => Date.parse(event.startAt) < toMs && Date.parse(event.endAt) > fromMs,
  );
}

function isValidTimezone(timezone: string): boolean {
  if (timezone === '') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
