import { z } from 'zod';

import type { LifeEventRepository } from '@/data/life-event-repository';
import { candidateToNewLifeEvent } from '@/domain/capture/candidate-to-event';
import { LifeEventValidationError } from '@/domain/life-event/errors';
import { createLifeEvent, systemDeps } from '@/domain/life-event/factory';
import type { LifeEvent, NewLifeEventInput } from '@/domain/life-event/types';
import { type ApiEnvelope, fail, ok } from '@/lib/api/envelope';

const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const MemoryItemSchema = z
  .object({
    title: z.string().trim().max(200).default(''),
    description: z.string().max(2000).nullish().default(null),
    category: z.string().trim().max(60).nullish().default(null),
    categoryConfidence: z.number().min(0).max(1).nullish().default(null),
    startLocalTime: z.string().regex(LOCAL_TIME_PATTERN).optional(),
    endLocalTime: z.string().regex(LOCAL_TIME_PATTERN).optional(),
    startAt: z.string().optional(),
    endAt: z.string().optional(),
    people: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    place: z.string().trim().max(120).nullish().default(null),
    notes: z.string().max(4000).nullish().default(null),
    kind: z.enum(['substantive', 'unremembered']).default('substantive'),
    source: z
      .enum(['life-conversation', 'gap-fill', 'quick-add', 'manual-edit', 'ai-reconstruction'])
      .default('life-conversation'),
  })
  .refine(
    (memory) =>
      (memory.startLocalTime !== undefined && memory.endLocalTime !== undefined) ||
      (memory.startAt !== undefined && memory.endAt !== undefined),
    'each memory needs either startLocalTime/endLocalTime or startAt/endAt',
  );

const CommitBodySchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'localDate must be YYYY-MM-DD'),
  timezone: z.string().refine(isValidTimezone, 'timezone must be a valid IANA timezone'),
  memories: z.array(MemoryItemSchema).min(1).max(100),
});

export interface CommitResponse {
  readonly ids: readonly string[];
}

/**
 * The only door through which memories become permanent (§5.4): everything
 * arriving here has been reviewed by the user. Every memory validates before
 * anything is saved; if the save phase itself fails partway, already-saved
 * memories from this commit are rolled back (best effort) so the caller can
 * trust "nothing was kept" and simply retry.
 */
export async function handleCommitMemories(
  body: unknown,
  repository: LifeEventRepository,
  userId: string,
): Promise<{ status: number; body: ApiEnvelope<CommitResponse> }> {
  const parsed = CommitBodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { status: 400, body: fail(issue?.message ?? 'invalid request') };
  }

  const { localDate, timezone, memories } = parsed.data;
  const events: LifeEvent[] = [];

  for (const [index, memory] of memories.entries()) {
    try {
      const input: NewLifeEventInput =
        memory.startAt !== undefined && memory.endAt !== undefined
          ? {
              userId,
              title: memory.title,
              description: memory.description,
              category: memory.category,
              categoryConfidence: memory.categoryConfidence,
              startAt: memory.startAt,
              endAt: memory.endAt,
              timezone,
              kind: memory.kind,
              source: memory.source,
              people: memory.people,
              place: memory.place,
              notes: memory.notes,
            }
          : {
              ...candidateToNewLifeEvent(
                {
                  title: memory.title,
                  description: memory.description,
                  category: memory.category,
                  categoryConfidence: memory.categoryConfidence,
                  startLocalTime: memory.startLocalTime as string,
                  endLocalTime: memory.endLocalTime as string,
                  timeConfidence: 1,
                  people: memory.people,
                  place: memory.place,
                },
                { userId, localDate, timezone, source: memory.source },
              ),
              kind: memory.kind,
              notes: memory.notes,
            };

      events.push(createLifeEvent(input, systemDeps));
    } catch (error) {
      const reason =
        error instanceof LifeEventValidationError || error instanceof RangeError
          ? error.message
          : 'could not be saved';
      return { status: 400, body: fail(`memories[${index}]: ${reason}`) };
    }
  }

  const savedIds: string[] = [];
  try {
    for (const event of events) {
      await repository.save(event);
      savedIds.push(event.id);
    }
  } catch (error) {
    console.error('memory commit failed mid-save; rolling back', error);
    await Promise.all(
      savedIds.map((id) => repository.deleteById(userId, id).catch(() => undefined)),
    );
    return {
      status: 500,
      body: fail(
        'Your memories could not be kept just now — nothing from this commit was saved. Please try again.',
      ),
    };
  }

  return { status: 200, body: ok({ ids: events.map((event) => event.id) }) };
}

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
