import type { LifeEventRepository } from '@/data/life-event-repository';
import {
  buildForgottenMomentsInvite,
  type ForgottenMomentsInvite,
} from '@/domain/forgotten-moments/invite';
import type { LifeEvent } from '@/domain/life-event/types';
import {
  buildDayTimeline,
  detectGaps,
  rememberedShare,
  type Gap,
} from '@/domain/timeline/gaps';
import { type ApiEnvelope, fail, ok } from '@/lib/api/envelope';
import { dayBoundsUtc } from '@/lib/time/day-bounds';
import { localTimeOf } from '@/lib/time/format';

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface EventView {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly category: string | null;
  readonly people: readonly string[];
  readonly place: string | null;
  readonly notes: string | null;
  readonly kind: LifeEvent['kind'];
  readonly source: LifeEvent['source'];
  readonly startAt: string;
  readonly endAt: string;
  readonly startLabel: string;
  readonly endLabel: string;
}

export interface GapView extends Gap {
  readonly startLabel: string;
  readonly endLabel: string;
}

export type SegmentView =
  | { readonly type: 'event'; readonly event: EventView }
  | { readonly type: 'gap'; readonly gap: GapView };

export interface DayResponse {
  readonly date: string;
  readonly timezone: string;
  readonly rememberedShare: number | null;
  readonly segments: readonly SegmentView[];
  readonly invite: ForgottenMomentsInvite | null;
}

/** Today's Story as data (§5.3): everything computed from LifeEvents, nothing stored. */
export async function handleDayRequest(
  query: { date?: string | null; tz?: string | null },
  repository: LifeEventRepository,
  userId: string,
): Promise<{ status: number; body: ApiEnvelope<DayResponse> }> {
  const date = query.date ?? '';
  const timezone = query.tz ?? '';
  if (!LOCAL_DATE_PATTERN.test(date)) {
    return { status: 400, body: fail('date must be YYYY-MM-DD') };
  }
  if (!isValidTimezone(timezone)) {
    return { status: 400, body: fail('tz must be a valid IANA timezone') };
  }

  const bounds = dayBoundsUtc(date, timezone);
  const events = await repository.listBetween(userId, bounds.fromUtc, bounds.toUtc);

  const segments: SegmentView[] = buildDayTimeline(events).map((segment) =>
    segment.type === 'event'
      ? { type: 'event', event: toEventView(segment.event) }
      : {
          type: 'gap',
          gap: {
            ...segment.gap,
            startLabel: localTimeOf(segment.gap.startAt, timezone),
            endLabel: localTimeOf(segment.gap.endAt, timezone),
          },
        },
  );

  return {
    status: 200,
    body: ok({
      date,
      timezone,
      rememberedShare: rememberedShare(events),
      segments,
      invite: buildForgottenMomentsInvite(detectGaps(events), timezone),
    }),
  };
}

function toEventView(event: LifeEvent): EventView {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    people: event.people,
    place: event.place,
    notes: event.notes,
    kind: event.kind,
    source: event.source,
    startAt: event.startAt,
    endAt: event.endAt,
    startLabel: localTimeOf(event.startAt, event.timezone),
    endLabel: localTimeOf(event.endAt, event.timezone),
  };
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
