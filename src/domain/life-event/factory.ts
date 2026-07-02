import { LifeEventValidationError } from '@/domain/life-event/errors';
import type {
  LifeEvent,
  LifeEventFactoryDeps,
  LifeEventPatch,
  NewLifeEventInput,
} from '@/domain/life-event/types';

const PATCHABLE_FIELDS = new Set<string>([
  'title',
  'description',
  'category',
  'categoryConfidence',
  'startAt',
  'endAt',
  'timezone',
  'kind',
  'source',
  'people',
  'place',
  'notes',
]);

export const systemDeps: LifeEventFactoryDeps = {
  id: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
};

export function createLifeEvent(input: NewLifeEventInput, deps: LifeEventFactoryDeps): LifeEvent {
  const kind = input.kind ?? 'substantive';
  const title = (input.title ?? '').trim();
  const createdAt = deps.now();

  validateTitle(title, kind);
  validateInstant('startAt', input.startAt);
  validateInstant('endAt', input.endAt);
  validateTimeOrder(input.startAt, input.endAt);
  validateTimezone(input.timezone);
  validateCategoryConfidence(input.categoryConfidence ?? null);

  return freezeLifeEvent({
    id: deps.id(),
    userId: input.userId,
    title,
    description: input.description ?? null,
    category: input.category ?? null,
    categoryConfidence: input.categoryConfidence ?? null,
    startAt: input.startAt,
    endAt: input.endAt,
    timezone: input.timezone,
    kind,
    source: input.source,
    people: input.people ?? [],
    place: input.place ?? null,
    notes: input.notes ?? null,
    version: 1,
    createdAt,
    updatedAt: createdAt,
  });
}

/**
 * Returns a new LifeEvent with the patch applied — never mutates the original.
 * Identity and history (id, userId, createdAt, version) are protected; version
 * bumps automatically so every correction stays visible (§5.11).
 */
export function updateLifeEvent(
  event: LifeEvent,
  patch: LifeEventPatch,
  deps: Pick<LifeEventFactoryDeps, 'now'>,
): LifeEvent {
  for (const key of Object.keys(patch)) {
    if (!PATCHABLE_FIELDS.has(key)) {
      throw new LifeEventValidationError(key, 'cannot be changed');
    }
  }

  const merged = { ...event, ...patch };
  const kind = merged.kind;
  const title = (merged.title ?? '').trim();

  validateTitle(title, kind);
  validateInstant('startAt', merged.startAt);
  validateInstant('endAt', merged.endAt);
  validateTimeOrder(merged.startAt, merged.endAt);
  validateTimezone(merged.timezone);
  validateCategoryConfidence(merged.categoryConfidence);

  return freezeLifeEvent({
    ...merged,
    title,
    id: event.id,
    userId: event.userId,
    createdAt: event.createdAt,
    version: event.version + 1,
    updatedAt: deps.now(),
  });
}

/** Deep-freezes (event + people array) so accidental mutation is impossible. */
export function freezeLifeEvent(event: LifeEvent): LifeEvent {
  return Object.freeze({ ...event, people: Object.freeze([...event.people]) });
}

function validateTitle(trimmedTitle: string, kind: LifeEvent['kind']): void {
  if (kind !== 'unremembered' && trimmedTitle === '') {
    throw new LifeEventValidationError('title', 'is required for a substantive memory');
  }
}

function validateInstant(field: string, value: string): void {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new LifeEventValidationError(field, `is not a valid instant: ${JSON.stringify(value)}`);
  }
}

function validateTimeOrder(startAt: string, endAt: string): void {
  if (Date.parse(endAt) <= Date.parse(startAt)) {
    throw new LifeEventValidationError('endAt', 'must be after startAt');
  }
}

function validateTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
  } catch {
    throw new LifeEventValidationError('timezone', `is not a valid IANA timezone: ${timezone}`);
  }
}

function validateCategoryConfidence(value: number | null): void {
  if (value === null) return;
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > 1) {
    throw new LifeEventValidationError('categoryConfidence', 'must be between 0 and 1');
  }
}
