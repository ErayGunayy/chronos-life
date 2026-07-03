import type { CaptureResponse } from '@/app/api/capture/handler';
import type { DayResponse } from '@/app/api/day/handler';
import type { CommitResponse } from '@/app/api/memories/handler';
import type { ApiEnvelope } from '@/lib/api/envelope';

export interface MemoryCommitItem {
  readonly title?: string;
  readonly description?: string | null;
  readonly category?: string | null;
  readonly categoryConfidence?: number | null;
  readonly startLocalTime?: string;
  readonly endLocalTime?: string;
  readonly startAt?: string;
  readonly endAt?: string;
  readonly people?: readonly string[];
  readonly place?: string | null;
  readonly notes?: string | null;
  readonly kind?: 'substantive' | 'unremembered';
  readonly source?: 'life-conversation' | 'gap-fill' | 'quick-add' | 'manual-edit';
}

export function fetchDay(date: string, timezone: string): Promise<DayResponse> {
  return requestJson<DayResponse>(
    `/api/day?date=${encodeURIComponent(date)}&tz=${encodeURIComponent(timezone)}`,
  );
}

export function extractStory(
  narrative: string,
  localDate: string,
  timezone: string,
): Promise<CaptureResponse> {
  return requestJson<CaptureResponse>('/api/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ narrative, localDate, timezone }),
  });
}

export function commitMemories(
  localDate: string,
  timezone: string,
  memories: readonly MemoryCommitItem[],
): Promise<CommitResponse> {
  return requestJson<CommitResponse>('/api/memories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ localDate, timezone, memories }),
  });
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!envelope || !envelope.success || envelope.data === null) {
    throw new Error(envelope?.error ?? 'Something went wrong — please try again.');
  }
  return envelope.data;
}
