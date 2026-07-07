import type { ExtractionRequest, ExtractionResult } from '@/domain/capture/types';

/**
 * The extraction boundary (CLAUDE.md §8): AI sits behind this interface so the
 * model is swappable and the rest of the app never talks to a vendor SDK.
 * `kind` travels with every result so the UI can honestly mark what produced
 * a candidate (§5.12: nothing AI-generated may pass as user-authored).
 */
export type ExtractorKind = 'claude' | 'gemini' | 'ollama' | 'stub';

export interface LifeEventExtractor {
  readonly kind: ExtractorKind;
  extract(request: ExtractionRequest): Promise<ExtractionResult>;
}
