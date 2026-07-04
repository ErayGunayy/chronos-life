import type { DeleteAllResponse } from '@/app/api/data/handler';
import { requestJson } from '@/components/today/api';

export function deleteAllData(): Promise<DeleteAllResponse> {
  return requestJson<DeleteAllResponse>('/api/data', { method: 'DELETE' });
}
