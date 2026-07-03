import { z } from 'zod';

import type { ExtractorKind, LifeEventExtractor } from '@/ai/life-event-extractor';
import type { CandidateEvent } from '@/domain/capture/types';
import { type ApiEnvelope, fail, ok } from '@/lib/api/envelope';

const MAX_NARRATIVE_LENGTH = 20_000;

const CaptureBodySchema = z.object({
  narrative: z
    .string()
    .trim()
    .min(1, 'narrative is required — tell the story of your day')
    .max(MAX_NARRATIVE_LENGTH, 'narrative is too long for one capture'),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'localDate must be YYYY-MM-DD'),
  timezone: z.string().refine(isValidTimezone, 'timezone must be a valid IANA timezone'),
});

export interface CaptureResponse {
  readonly candidates: readonly CandidateEvent[];
  readonly note: string | null;
  /** Marks provenance so the UI can label AI-extracted content (§5.12). */
  readonly extractor: ExtractorKind;
}

export interface CaptureHandlerResult {
  readonly status: number;
  readonly body: ApiEnvelope<CaptureResponse>;
}

export async function handleCaptureRequest(
  body: unknown,
  extractor: LifeEventExtractor,
): Promise<CaptureHandlerResult> {
  const parsed = CaptureBodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { status: 400, body: fail(issue?.message ?? 'invalid request') };
  }

  try {
    const result = await extractor.extract(parsed.data);
    return {
      status: 200,
      body: ok({
        candidates: result.candidates,
        note: result.note,
        extractor: extractor.kind,
      }),
    };
  } catch (error) {
    console.error('capture extraction failed', error);
    return {
      status: 502,
      body: fail(
        'Your story could not be read right now. Nothing was lost — please try again in a moment.',
      ),
    };
  }
}

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
