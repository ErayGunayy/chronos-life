import type { CandidateEvent } from '@/domain/capture/types';
import type { LifeEventSource, NewLifeEventInput } from '@/domain/life-event/types';
import { nextLocalDate, utcInstantAtLocalTime } from '@/lib/time/day-bounds';

export interface CaptureContext {
  readonly userId: string;
  readonly localDate: string;
  readonly timezone: string;
  readonly source: LifeEventSource;
}

/**
 * Turns a reviewed candidate into factory input. Wall-clock times resolve in
 * the narrator's timezone; an end time at or before the start time means the
 * moment crossed midnight into the next day.
 */
export function candidateToNewLifeEvent(
  candidate: CandidateEvent,
  context: CaptureContext,
): NewLifeEventInput {
  const startAt = utcInstantAtLocalTime(
    context.localDate,
    candidate.startLocalTime,
    context.timezone,
  );
  let endAt = utcInstantAtLocalTime(context.localDate, candidate.endLocalTime, context.timezone);
  if (Date.parse(endAt) <= Date.parse(startAt)) {
    endAt = utcInstantAtLocalTime(
      nextLocalDate(context.localDate),
      candidate.endLocalTime,
      context.timezone,
    );
  }

  return {
    userId: context.userId,
    title: candidate.title,
    description: candidate.description,
    category: candidate.category,
    categoryConfidence: candidate.categoryConfidence,
    startAt,
    endAt,
    timezone: context.timezone,
    source: context.source,
    people: candidate.people,
    place: candidate.place,
    notes: null,
  };
}
