import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

import { ExtractionError } from '@/ai/errors';
import type { LifeEventExtractor } from '@/ai/life-event-extractor';
import type { ExtractionRequest, ExtractionResult } from '@/domain/capture/types';

/** CLAUDE.md §8: default extraction model, swappable via constructor/env. */
export const DEFAULT_EXTRACTION_MODEL = 'claude-sonnet-5';

const USER_SAFE_FAILURE =
  'Your story could not be read right now. Nothing was lost — please try again in a moment.';

const CandidateEventSchema = z.object({
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

const ExtractionOutputSchema = z.object({
  candidates: z.array(CandidateEventSchema),
  note: z.string().nullable(),
});

/**
 * The slice of the Anthropic client this extractor needs — injected so tests
 * run against a mock and never the network.
 */
export interface MinimalAnthropicClient {
  messages: {
    parse(params: Record<string, unknown>): Promise<{ parsed_output?: unknown }>;
  };
}

export class ClaudeExtractor implements LifeEventExtractor {
  readonly kind = 'claude' as const;
  private readonly client: MinimalAnthropicClient;
  private readonly model: string;

  constructor(options: { client: MinimalAnthropicClient; model?: string }) {
    this.client = options.client;
    this.model = options.model ?? DEFAULT_EXTRACTION_MODEL;
  }

  async extract(request: ExtractionRequest): Promise<ExtractionResult> {
    let response: { parsed_output?: unknown };
    try {
      response = await this.client.messages.parse({
        model: this.model,
        max_tokens: 16000,
        system: buildSystemPrompt(request),
        messages: [
          {
            role: 'user',
            content: `The story of ${request.localDate}:\n\n${request.narrative}`,
          },
        ],
        output_config: { format: zodOutputFormat(ExtractionOutputSchema) },
      });
    } catch (error) {
      // Provider error strings can carry key material — never forward them.
      throw new ExtractionError(USER_SAFE_FAILURE, { cause: error });
    }

    const parsed = ExtractionOutputSchema.safeParse(response.parsed_output);
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
}

/**
 * Encodes CLAUDE.md §4 AI rules directly into the prompt: no invention,
 * honest uncertainty, no judgment vocabulary, human titles.
 */
function buildSystemPrompt(request: ExtractionRequest): string {
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
  ].join('\n');
}
