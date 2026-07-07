import { ExtractionError } from '@/ai/errors';
import {
  USER_SAFE_FAILURE,
  buildExtractionSystemPrompt,
  buildUserMessage,
  toExtractionResult,
} from '@/ai/extraction-contract';
import type { LifeEventExtractor } from '@/ai/life-event-extractor';
import type { ExtractionRequest, ExtractionResult } from '@/domain/capture/types';

/**
 * Extraction via the Google Gemini API — a free-tier cloud option (Google AI
 * Studio). Same contract and guardrails as the Claude/Ollama extractors; only
 * the transport differs. Structured output is enforced with a responseSchema so
 * times and fields come back reliably even on the fast Flash models.
 */

export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
export const DEFAULT_GEMINI_HOST = 'https://generativelanguage.googleapis.com';

/**
 * Gemini's responseSchema (an OpenAPI subset). Mirrors CandidateEventSchema in
 * extraction-contract.ts — kept by hand because Gemini rejects some JSON-Schema
 * keywords `z.toJSONSchema` emits. Zod still validates the result, so any drift
 * surfaces as a friendly retry, never a bad memory.
 */
const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    candidates: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          description: { type: 'STRING', nullable: true },
          category: { type: 'STRING', nullable: true },
          categoryConfidence: { type: 'NUMBER', nullable: true },
          startLocalTime: { type: 'STRING' },
          endLocalTime: { type: 'STRING' },
          timeConfidence: { type: 'NUMBER' },
          people: { type: 'ARRAY', items: { type: 'STRING' } },
          place: { type: 'STRING', nullable: true },
        },
        required: [
          'title',
          'description',
          'category',
          'categoryConfidence',
          'startLocalTime',
          'endLocalTime',
          'timeConfidence',
          'people',
          'place',
        ],
        propertyOrdering: [
          'title',
          'description',
          'category',
          'categoryConfidence',
          'startLocalTime',
          'endLocalTime',
          'timeConfidence',
          'people',
          'place',
        ],
      },
    },
    note: { type: 'STRING', nullable: true },
  },
  required: ['candidates', 'note'],
  propertyOrdering: ['candidates', 'note'],
} as const;

export interface GeminiResponse {
  readonly candidates?: ReadonlyArray<{
    readonly content?: { readonly parts?: ReadonlyArray<{ readonly text?: string }> };
  }>;
}

/** The slice of Gemini this extractor needs — injected so tests never hit the network. */
export interface GeminiClient {
  generate(params: { model: string; body: Record<string, unknown> }): Promise<GeminiResponse>;
}

export class GeminiExtractor implements LifeEventExtractor {
  readonly kind = 'gemini' as const;
  private readonly client: GeminiClient;
  private readonly model: string;

  constructor(options: { client: GeminiClient; model?: string }) {
    this.client = options.client;
    this.model = options.model ?? DEFAULT_GEMINI_MODEL;
  }

  async extract(request: ExtractionRequest): Promise<ExtractionResult> {
    let response: GeminiResponse;
    try {
      response = await this.client.generate({
        model: this.model,
        body: {
          systemInstruction: { parts: [{ text: buildExtractionSystemPrompt(request) }] },
          contents: [{ role: 'user', parts: [{ text: buildUserMessage(request) }] }],
          generationConfig: {
            // Deterministic extraction: no creative sampling when reading a memory.
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: GEMINI_RESPONSE_SCHEMA,
          },
        },
      });
    } catch (error) {
      // Provider error strings can carry key material — never forward them.
      throw new ExtractionError(USER_SAFE_FAILURE, { cause: error });
    }

    const content = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof content !== 'string' || content.trim() === '') {
      throw new ExtractionError(USER_SAFE_FAILURE, { cause: new Error('empty model response') });
    }

    let rawOutput: unknown;
    try {
      rawOutput = JSON.parse(content);
    } catch (error) {
      throw new ExtractionError(USER_SAFE_FAILURE, { cause: error });
    }

    return toExtractionResult(rawOutput);
  }
}

/**
 * HTTP-backed Gemini client over the generateContent endpoint. No SDK — a single
 * fetch. The API key travels in the header, never the URL/query.
 */
export function createHttpGeminiClient(
  apiKey: string,
  host: string = DEFAULT_GEMINI_HOST,
): GeminiClient {
  const base = host.replace(/\/+$/, '');
  return {
    async generate({ model, body }): Promise<GeminiResponse> {
      const response = await fetch(`${base}/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`gemini generateContent ${response.status}: ${detail.slice(0, 200)}`);
      }
      return (await response.json()) as GeminiResponse;
    },
  };
}
