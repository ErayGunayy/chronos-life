import type { LifeEvent } from '@/domain/life-event/types';
import { detectGaps } from '@/domain/timeline/gaps';
import { hourOfDayBucket } from '@/lib/time/hour-bucket';

/**
 * The pattern engine (CLAUDE.md §6.6) — the compounding layer that makes
 * forgotten time mean something over time. Pure functions over computed gap
 * data; nothing here is ever stored (§8). Thresholds get stricter at each
 * level on purpose: a bigger claim requires stronger evidence.
 */

export const WEEKLY_PATTERN_MIN_DAYS = 7;
export const WEEKLY_PATTERN_THRESHOLD = 0.5;
export const MONTHLY_PROMOTION_MIN_WEEKS = 4;
export const MONTHLY_PROMOTION_THRESHOLD = 0.75;
export const YEARLY_PROMOTION_MIN_MONTHS = 12;
export const YEARLY_PROMOTION_THRESHOLD = 0.75;

/** Sampling stride when mapping an interval onto hour buckets. */
const BUCKET_SAMPLE_STEP_MS = 30 * 60_000;
const ONE_MINUTE_MS = 60_000;

export interface DayGapSummary {
  readonly localDate: string;
  /** Local hour-of-day buckets (0–23) touched by forgotten time that day. */
  readonly forgottenHourBuckets: ReadonlySet<number>;
}

export interface HourPattern {
  readonly bucket: number;
  /** How often the bucket recurred across the cycles considered (0..1). */
  readonly share: number;
  readonly daysWithData?: number;
}

/**
 * One day's forgotten time as hour buckets: open Forgotten Moments plus
 * unremembered records — both are time that happened but wasn't remembered.
 */
export function summarizeDayGaps(
  localDate: string,
  events: readonly LifeEvent[],
  timezone: string,
): DayGapSummary {
  const intervals: Array<{ startAt: string; endAt: string }> = [
    ...detectGaps(events).filter((gap) => gap.kind === 'forgotten-moment'),
    ...events.filter((event) => event.kind === 'unremembered'),
  ];

  const buckets = new Set<number>();
  for (const { startAt, endAt } of intervals) {
    const startMs = Date.parse(startAt);
    const endMs = Date.parse(endAt);
    for (let t = startMs; t < endMs; t += BUCKET_SAMPLE_STEP_MS) {
      buckets.add(hourOfDayBucket(new Date(t).toISOString(), timezone));
    }
    const tailMs = Math.max(startMs, endMs - ONE_MINUTE_MS);
    buckets.add(hourOfDayBucket(new Date(tailMs).toISOString(), timezone));
  }

  return { localDate, forgottenHourBuckets: buckets };
}

/**
 * Weekly patterns: never computed before a full week of narrated days —
 * false confidence from small samples is a trust failure, not a feature.
 */
export function weeklyPatterns(days: readonly DayGapSummary[]): HourPattern[] {
  if (days.length < WEEKLY_PATTERN_MIN_DAYS) return [];

  const counts = countBuckets(days.map((day) => day.forgottenHourBuckets));
  return [...counts.entries()]
    .map(([bucket, count]) => ({
      bucket,
      share: count / days.length,
      daysWithData: days.length,
    }))
    .filter((pattern) => pattern.share >= WEEKLY_PATTERN_THRESHOLD)
    .sort((a, b) => b.share - a.share || a.bucket - b.bucket);
}

/** Promotion across the last 4 weekly cycles (≥75%, i.e. 3 of 4). */
export function monthlyPatterns(weeklyCycles: readonly ReadonlySet<number>[]): HourPattern[] {
  return promote(weeklyCycles, MONTHLY_PROMOTION_MIN_WEEKS, MONTHLY_PROMOTION_THRESHOLD);
}

/** Promotion across the last 12 monthly cycles (≥75%, i.e. 9 of 12) — a "life theme". */
export function yearlyPatterns(monthlyCycles: readonly ReadonlySet<number>[]): HourPattern[] {
  return promote(monthlyCycles, YEARLY_PROMOTION_MIN_MONTHS, YEARLY_PROMOTION_THRESHOLD);
}

/** "15:00–16:00" — patterns are keyed by hour range, never weekday (§6.6). */
export function bucketRangeLabel(bucket: number): string {
  const pad = (hour: number) => String(hour).padStart(2, '0');
  return `${pad(bucket)}:00–${pad((bucket + 1) % 24)}:00`;
}

function promote(
  cycles: readonly ReadonlySet<number>[],
  minCycles: number,
  threshold: number,
): HourPattern[] {
  if (cycles.length < minCycles) return [];

  const window = cycles.slice(-minCycles);
  const counts = countBuckets(window);
  return [...counts.entries()]
    .map(([bucket, count]) => ({ bucket, share: count / window.length }))
    .filter((pattern) => pattern.share >= threshold)
    .sort((a, b) => b.share - a.share || a.bucket - b.bucket);
}

function countBuckets(cycles: readonly ReadonlySet<number>[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const cycle of cycles) {
    for (const bucket of cycle) {
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    }
  }
  return counts;
}
