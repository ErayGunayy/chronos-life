import { z } from 'zod';

import { ExtractionError } from '@/ai/errors';
import type { ExtractionRequest, ExtractionResult } from '@/domain/capture/types';

/**
 * The provider-neutral extraction contract: the output schema and the system
 * prompt that encodes CLAUDE.md §4 AI rules. Every extractor (Claude, Ollama,
 * any future model) shares this so the product's guardrails — no invention,
 * honest uncertainty, no judgment — never drift between providers.
 */

export const USER_SAFE_FAILURE =
  'Your story could not be read right now. Nothing was lost — please try again in a moment.';

export const CandidateEventSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  categoryConfidence: z.number().min(0).max(1).nullable(),
  startLocalTime: z.string(),
  endLocalTime: z.string(),
  timeConfidence: z.number().min(0).max(1),
  people: z.array(z.string()),
  place: z.string().nullable(),
});

export const ExtractionOutputSchema = z.object({
  candidates: z.array(CandidateEventSchema),
  note: z.string().nullable(),
});

export type ExtractionOutput = z.infer<typeof ExtractionOutputSchema>;

/**
 * Coerces a model's time string to strict zero-padded HH:MM, or null when it
 * can't be placed in time. Models return valid-but-loose times ("9:00",
 * "09:00:00", "24:00" for midnight) that the commit-time schema (strict HH:MM)
 * rejects — this normalizes them so a good memory isn't lost to a formatting
 * quirk. Returns null for empty/garbage so such a candidate is dropped, not
 * saved with a fake time.
 */
export function normalizeLocalTime(raw: string): string | null {
  // Pull the first H:MM out of the string — handles plain "9:00"/"09:00:00" and
  // full ISO datetimes some models return ("2026-07-08T09:00:00"). Dates use "-",
  // so the first colon-separated pair is always the clock time.
  const match = /(\d{1,2}):(\d{1,2})/.exec(raw.trim());
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour === 24 && minute === 0) hour = 0; // midnight written as 24:00
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Validates raw model output and returns candidates sorted by start time, with
 * times normalized to strict HH:MM. Anything that does not match the schema
 * becomes a typed ExtractionError so a malformed model response is a friendly
 * retry, never a crash or a false memory; a candidate whose times can't be
 * placed at all is dropped (the prompt already asks the model to omit these).
 */
export function toExtractionResult(rawOutput: unknown): ExtractionResult {
  const parsed = ExtractionOutputSchema.safeParse(rawOutput);
  if (!parsed.success) {
    throw new ExtractionError(USER_SAFE_FAILURE, { cause: parsed.error });
  }

  const candidates = parsed.data.candidates.flatMap((candidate) => {
    const startLocalTime = normalizeLocalTime(candidate.startLocalTime);
    const endLocalTime = normalizeLocalTime(candidate.endLocalTime);
    if (startLocalTime === null || endLocalTime === null) return [];
    return [{ ...candidate, startLocalTime, endLocalTime }];
  });

  candidates.sort((a, b) => a.startLocalTime.localeCompare(b.startLocalTime));

  return { candidates, note: parsed.data.note };
}

/** The user turn: the story exactly as told, anchored to its local day. */
export function buildUserMessage(request: ExtractionRequest): string {
  return `The story of ${request.localDate}:\n\n${request.narrative}`;
}

/**
 * Encodes CLAUDE.md §4 AI rules directly into the prompt: no invention,
 * honest uncertainty, no judgment vocabulary, human titles.
 */
export function buildExtractionSystemPrompt(request: ExtractionRequest): string {
  return [
    "You turn one person's natural-language story of their day into structured candidate life events that THEY will review and approve. You organize their memory — you never author it.",
    '',
    'Non-negotiable rules:',
    '- NEVER invent events, times, people, places, or details the story does not contain.',
    `- Times are the narrator's wall clock on ${request.localDate} in ${request.timezone}. Write startLocalTime and endLocalTime as a 24-hour HH:MM clock time ONLY (e.g. "09:00", "21:30") — never a date, never seconds, never a range. If a time is approximate ("around nine") or inferred from narrative order or time-of-day words ("in the morning", "sabah", "akşam"), still fill it in with your best estimate, but set timeConfidence at or below 0.6 — never pretend precision. Only leave an event out (and note it) if it truly cannot be placed in the day at all.`,
    '- An endLocalTime earlier than startLocalTime means the moment ended the next day.',
    '- categoryConfidence and timeConfidence are honest 0..1 calibrations. Suggest a short human category ("Work", "Family", "Rest", ...) only when reasonably clear; otherwise leave category and categoryConfidence null.',
    '- people: only people the story mentions. place: only if stated.',
    '- note: at most one short, neutral sentence about anything you could not capture; otherwise null.',
    '- Never use judgmental language anywhere. The words "wasted", "failed", "lazy", and "disappointing" are banned. You observe; the narrator decides what mattered.',
    '- Titles read like human memories ("Coffee with Sarah"), never like records ("Session 34").',
    '- The story may be in any language. Keep titles, descriptions, categories, people, and places in the same language the narrator used.',
  ].join('\n');
}
