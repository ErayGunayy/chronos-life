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
 * Validates raw model output and returns candidates sorted by start time.
 * Anything that does not match the schema becomes a typed ExtractionError so a
 * malformed model response is a friendly retry, never a crash or a false memory.
 */
export function toExtractionResult(rawOutput: unknown): ExtractionResult {
  const parsed = ExtractionOutputSchema.safeParse(rawOutput);
  if (!parsed.success) {
    throw new ExtractionError(USER_SAFE_FAILURE, { cause: parsed.error });
  }
  return {
    candidates: [...parsed.data.candidates].sort((a, b) =>
      a.startLocalTime.localeCompare(b.startLocalTime),
    ),
    note: parsed.data.note,
  };
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
    `- Times are the narrator's wall clock on ${request.localDate} in ${request.timezone}. If a time is approximate ("around nine") or inferred from narrative order, still fill it in, but set timeConfidence at or below 0.6 — never pretend precision. If an event cannot be placed in time at all, leave it out of candidates and mention it briefly in note.`,
    '- An endLocalTime earlier than startLocalTime means the moment ended the next day.',
    '- categoryConfidence and timeConfidence are honest 0..1 calibrations. Suggest a short human category ("Work", "Family", "Rest", ...) only when reasonably clear; otherwise leave category and categoryConfidence null.',
    '- people: only people the story mentions. place: only if stated.',
    '- note: at most one short, neutral sentence about anything you could not capture; otherwise null.',
    '- Never use judgmental language anywhere. The words "wasted", "failed", "lazy", and "disappointing" are banned. You observe; the narrator decides what mattered.',
    '- Titles read like human memories ("Coffee with Sarah"), never like records ("Session 34").',
    '- The story may be in any language. Keep titles, descriptions, categories, people, and places in the same language the narrator used.',
  ].join('\n');
}
