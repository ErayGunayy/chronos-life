/**
 * LifeEvent — the fundamental domain object (CLAUDE.md §5.1).
 *
 * Every other system (timeline, gaps, patterns, reflections, export) is a
 * computed view over `LifeEvent[]`. Facts only — AI-generated interpretation
 * lives in Perspectives, never here (§5.12).
 */

/** Where a memory came from — kept for transparency on every block (§5.3). */
export type LifeEventSource =
  | 'life-conversation'
  | 'gap-fill'
  | 'quick-add'
  | 'manual-edit'
  | 'ai-reconstruction';

/**
 * 'unremembered' is a real, valid record — the user said "I don't remember"
 * about a gap (§6.4). It still renders as a question-mark and still counts
 * toward pattern detection, but is never re-surfaced in the daily invite.
 */
export type LifeEventKind = 'substantive' | 'unremembered';

export interface LifeEvent {
  readonly id: string;
  readonly userId: string;
  /** Human title ("Coffee with Sarah"). Empty only when kind is 'unremembered'. */
  readonly title: string;
  readonly description: string | null;
  readonly category: string | null;
  /** 0..1 — extractor's confidence in the category; null when user-authored (§5.1). */
  readonly categoryConfidence: number | null;
  /** UTC instant, ISO 8601. */
  readonly startAt: string;
  /** UTC instant, ISO 8601. Always after startAt. */
  readonly endAt: string;
  /** IANA timezone the moment was lived in — a "day" is local to this (§8). */
  readonly timezone: string;
  readonly kind: LifeEventKind;
  readonly source: LifeEventSource;
  readonly people: readonly string[];
  readonly place: string | null;
  readonly notes: string | null;
  /** Bumped on every edit — memories are living, never silently rewritten (§5.11). */
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface NewLifeEventInput {
  readonly userId: string;
  readonly title?: string;
  readonly description?: string | null;
  readonly category?: string | null;
  readonly categoryConfidence?: number | null;
  readonly startAt: string;
  readonly endAt: string;
  readonly timezone: string;
  readonly kind?: LifeEventKind;
  readonly source: LifeEventSource;
  readonly people?: readonly string[];
  readonly place?: string | null;
  readonly notes?: string | null;
}

/** Fields a user may correct later — identity and history stay protected. */
export type LifeEventPatch = Partial<
  Pick<
    LifeEvent,
    | 'title'
    | 'description'
    | 'category'
    | 'categoryConfidence'
    | 'startAt'
    | 'endAt'
    | 'timezone'
    | 'kind'
    | 'source'
    | 'people'
    | 'place'
    | 'notes'
  >
>;

export interface LifeEventFactoryDeps {
  id(): string;
  now(): string;
}
