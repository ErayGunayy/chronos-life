import 'server-only';

import Anthropic from '@anthropic-ai/sdk';

import { ClaudeExtractor, type MinimalAnthropicClient } from '@/ai/claude-extractor';
import type { LifeEventExtractor } from '@/ai/life-event-extractor';
import {
  OllamaExtractor,
  createHttpOllamaClient,
  DEFAULT_OLLAMA_MODEL,
} from '@/ai/ollama-extractor';
import { StubExtractor } from '@/ai/stub-extractor';

let cached: LifeEventExtractor | null = null;

/**
 * The only place provider config is read — server-only by import guard.
 *
 * Selection (CLAUDE.md §8, extraction is swappable):
 * - CHRONOS_EXTRACTOR forces a provider when set ('ollama' | 'claude' | 'stub').
 * - Otherwise: an Anthropic key → Claude; else an Ollama model → local Ollama;
 *   else the deterministic stub, so dev flows keep working offline and are
 *   honestly labelled as non-AI.
 */
export function getExtractor(): LifeEventExtractor {
  if (cached) return cached;
  cached = buildExtractor();
  return cached;
}

function buildExtractor(): LifeEventExtractor {
  const forced = process.env.CHRONOS_EXTRACTOR?.trim().toLowerCase();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const ollamaModel = process.env.CHRONOS_OLLAMA_MODEL;

  if (forced === 'stub') return new StubExtractor();
  if (forced === 'ollama') return buildOllama(ollamaModel);
  if (forced === 'claude') {
    if (!apiKey) throw new Error('CHRONOS_EXTRACTOR=claude but ANTHROPIC_API_KEY is not set');
    return buildClaude(apiKey);
  }

  if (apiKey) return buildClaude(apiKey);
  if (ollamaModel) return buildOllama(ollamaModel);
  return new StubExtractor();
}

function buildClaude(apiKey: string): LifeEventExtractor {
  return new ClaudeExtractor({
    client: asMinimalClient(new Anthropic({ apiKey })),
    model: process.env.CHRONOS_EXTRACTION_MODEL || undefined,
  });
}

function buildOllama(model: string | undefined): LifeEventExtractor {
  return new OllamaExtractor({
    client: createHttpOllamaClient(process.env.OLLAMA_HOST || undefined),
    model: model?.trim() || DEFAULT_OLLAMA_MODEL,
  });
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
