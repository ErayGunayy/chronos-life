import type { RingPeriod, RingResponse } from '@/app/api/ring/handler';
import { requestJson } from '@/components/today/api';

export function fetchRing(
  date: string,
  timezone: string,
  period: RingPeriod,
): Promise<RingResponse> {
  const params = new URLSearchParams({ date, tz: timezone, period });
  return requestJson<RingResponse>(`/api/ring?${params.toString()}`);
}
