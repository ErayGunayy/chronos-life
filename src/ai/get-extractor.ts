import 'server-only';

import Anthropic from '@anthropic-ai/sdk';

import { ClaudeExtractor, type MinimalAnthropicClient } from '@/ai/claude-extractor';
import type { LifeEventExtractor } from '@/ai/life-event-extractor';
import { StubExtractor } from '@/ai/stub-extractor';

let cached: LifeEventExtractor | null = null;

/**
 * The only place the Anthropic key is read — server-only by import guard.
 * Without a key, capture falls back to the deterministic stub so dev flows
 * keep working offline (and are honestly labelled as non-AI).
 */
export function getExtractor(): LifeEventExtractor {
  if (cached) return cached;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  cached = apiKey
    ? new ClaudeExtractor({
        client: asMinimalClient(new Anthropic({ apiKey })),
        model: process.env.CHRONOS_EXTRACTION_MODEL || undefined,
      })
    : new StubExtractor();
  return cached;
}

/**
 * Narrows the SDK client to the slice the extractor needs. The extractor
 * always builds a complete, valid params object; the cast below only bridges
 * the SDK's generic signature to our vendor-neutral boundary type.
 */
function asMinimalClient(anthropic: Anthropic): MinimalAnthropicClient {
  return {
    messages: {
      parse: (params) =>
        anthropic.messages.parse(
          params as unknown as Parameters<Anthropic['messages']['parse']>[0],
        ),
    },
  };
}
