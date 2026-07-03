/**
 * Capture boundary types (CLAUDE.md §5.4): a narrated story becomes candidate
 * events, which the person reviews and approves before anything persists.
 * Candidates are proposals, never facts — facts only exist after confirmation.
 */

export interface ExtractionRequest {
  /** The story, exactly as the narrator told it. */
  readonly narrative: string;
  /** The local calendar day the story is about (YYYY-MM-DD). */
  readonly localDate: string;
  /** IANA timezone the narrator lived the day in. */
  readonly timezone: string;
}

export interface CandidateEvent {
  readonly title: string;
  readonly description: string | null;
  readonly category: string | null;
  /** 0..1, null when no category was suggested. */
  readonly categoryConfidence: number | null;
  /** Narrator's wall clock, HH:MM. */
  readonly startLocalTime: string;
  /** HH:MM; earlier than startLocalTime means it ended the next day. */
  readonly endLocalTime: string;
  /** 0..1 — how sure the extractor is about the times (§5.1: never pretend certainty). */
  readonly timeConfidence: number;
  readonly people: readonly string[];
  readonly place: string | null;
}

export interface ExtractionResult {
  readonly candidates: readonly CandidateEvent[];
  /** One short, neutral sentence about anything that couldn't be captured. */
  readonly note: string | null;
}
