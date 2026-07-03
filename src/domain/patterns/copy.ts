import { bucketRangeLabel, type HourPattern } from '@/domain/patterns/engine';
import { assertCalmCopy } from '@/domain/reflection/tone';

/**
 * Pattern copy (§6.6): observational, never diagnostic, and the question is
 * always returned to the person — they own the interpretation. Every string
 * passes the tone guardrail before it can render.
 */

export function weeklyPatternObservation(pattern: Pick<HourPattern, 'bucket' | 'share'>): string {
  return assertCalmCopy(
    `Over the last week, ${bucketRangeLabel(pattern.bucket)} has often gone unaccounted for — that seems to be a recurring gap for you. Curious what's usually happening there?`,
  );
}

export function firstWeekMessage(): string {
  return assertCalmCopy(
    'Your first full week is still being written — patterns only appear once seven days of your story exist. What would you like this week to hold?',
  );
}

export function quietWeekMessage(): string {
  return assertCalmCopy(
    'No recurring gap stood out this week. Looking back across the days, what stayed with you?',
  );
}
