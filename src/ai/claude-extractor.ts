import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

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

/** CLAUDE.md §8: default extraction model, swappable via constructor/env. */
export const DEFAULT_EXTRACTION_MODEL = 'claude-sonnet-5';

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
        system: buildExtractionSystemPrompt(request),
        messages: [{ role: 'user', content: buildUserMessage(request) }],
        output_config: { format: zodOutputFormat(ExtractionOutputSchema) },
      });
    } catch (error) {
      // Provider error strings can carry key material — never forward them.
      throw new ExtractionError(USER_SAFE_FAILURE, { cause: error });
    }

    return toExtractionResult(response.parsed_output);
  }
}
