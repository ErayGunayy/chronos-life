import { z } from 'zod';

import { ExtractionError } from '@/ai/errors';
import {
  ExtractionOutputSchema,
  USER_SAFE_FAILURE,
  buildExtractionSystemPrompt,
  buildUserMessage,
  toExtractionResult,
} from '@/ai/extraction-contract';
import type { LifeEventExtractor } from '@/ai/life-event-extractor';
import type { ExtractionRequest, ExtractionResult } from '@/domain/capture/types';

/**
 * Local extraction via Ollama (http://localhost:11434 by default). Free and
 * fully private — the story never leaves the machine, the strongest fit for
 * Chronos's privacy-first principle (§9). Same contract and guardrails as the
 * Claude extractor; only the transport differs.
 */

export const DEFAULT_OLLAMA_MODEL = 'qwen2.5:14b';
export const DEFAULT_OLLAMA_HOST = 'http://localhost:11434';

/** JSON Schema the model output is constrained to (Ollama's `format` field). */
const OUTPUT_JSON_SCHEMA = z.toJSONSchema(ExtractionOutputSchema);

export interface OllamaChatResponse {
  readonly message?: { readonly content?: string };
}

/** The slice of Ollama this extractor needs — injected so tests never hit the network. */
export interface OllamaClient {
  chat(params: Record<string, unknown>): Promise<OllamaChatResponse>;
}

export class OllamaExtractor implements LifeEventExtractor {
  readonly kind = 'ollama' as const;
  private readonly client: OllamaClient;
  private readonly model: string;

  constructor(options: { client: OllamaClient; model?: string }) {
    this.client = options.client;
    this.model = options.model ?? DEFAULT_OLLAMA_MODEL;
  }

  async extract(request: ExtractionRequest): Promise<ExtractionResult> {
    let response: OllamaChatResponse;
    try {
      response = await this.client.chat({
        model: this.model,
        stream: false,
        format: OUTPUT_JSON_SCHEMA,
        // Deterministic extraction: no creative sampling when reading a memory.
        options: { temperature: 0 },
        messages: [
          { role: 'system', content: buildExtractionSystemPrompt(request) },
          { role: 'user', content: buildUserMessage(request) },
        ],
      });
    } catch (error) {
      // Local errors are safe-ish, but stay consistent with the Claude path.
      throw new ExtractionError(USER_SAFE_FAILURE, { cause: error });
    }

    const content = response.message?.content;
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
 * HTTP-backed Ollama client over the native /api/chat endpoint. No SDK
 * dependency — a single fetch. `host` defaults to the local daemon.
 */
export function createHttpOllamaClient(host: string = DEFAULT_OLLAMA_HOST): OllamaClient {
  const base = host.replace(/\/+$/, '');
  return {
    async chat(params: Record<string, unknown>): Promise<OllamaChatResponse> {
      const response = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`ollama /api/chat ${response.status}: ${detail.slice(0, 200)}`);
      }
      return (await response.json()) as OllamaChatResponse;
    },
  };
}
