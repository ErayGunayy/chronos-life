import { freezeLifeEvent } from '@/domain/life-event/factory';
import type { LifeEvent } from '@/domain/life-event/types';

/**
 * JSON export/import — the durability primitive (CLAUDE.md §5.11): memories
 * must stay readable and re-importable without Chronos. Versioned so future
 * schema changes can migrate old exports instead of breaking them.
 */

export const EXPORT_SCHEMA_VERSION = 1;

export interface JsonExport {
  readonly schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  readonly exportedAt: string;
  readonly events: readonly LifeEvent[];
}

export class ExportParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExportParseError';
  }
}

export function toJsonExport(
  events: readonly LifeEvent[],
  opts: { exportedAt: string },
): string {
  const sorted = [...events].sort(
    (a, b) => a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id),
  );
  const payload: JsonExport = {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: opts.exportedAt,
    events: sorted,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseJsonExport(json: string): JsonExport {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new ExportParseError('not valid JSON');
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new ExportParseError('export must be a JSON object');
  }
  const candidate = raw as Record<string, unknown>;

  if (candidate.schemaVersion !== EXPORT_SCHEMA_VERSION) {
    throw new ExportParseError(
      `unsupported schemaVersion: ${JSON.stringify(candidate.schemaVersion)} (expected ${EXPORT_SCHEMA_VERSION})`,
    );
  }
  if (typeof candidate.exportedAt !== 'string') {
    throw new ExportParseError('exportedAt must be a string');
  }
  if (!Array.isArray(candidate.events)) {
    throw new ExportParseError('events must be an array');
  }

  const events = candidate.events.map((entry, index) => {
    assertEventShape(entry, index);
    return freezeLifeEvent(entry);
  });

  return { schemaVersion: EXPORT_SCHEMA_VERSION, exportedAt: candidate.exportedAt, events };
}

function assertEventShape(entry: unknown, index: number): asserts entry is LifeEvent {
  if (typeof entry !== 'object' || entry === null) {
    throw new ExportParseError(`events[${index}] must be an object`);
  }
  const event = entry as Record<string, unknown>;
  for (const field of ['id', 'userId', 'startAt', 'endAt', 'timezone', 'kind', 'source'] as const) {
    if (typeof event[field] !== 'string') {
      throw new ExportParseError(`events[${index}].${field} must be a string`);
    }
  }
  if (!Array.isArray(event.people)) {
    throw new ExportParseError(`events[${index}].people must be an array`);
  }
}
