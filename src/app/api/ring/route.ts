import { handleRingRequest } from '@/app/api/ring/handler';
import { getRepository } from '@/data/get-repository';
import { getStateRepository } from '@/data/get-state-repository';
import { DEV_USER_ID } from '@/lib/dev-user';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const { status, body } = await handleRingRequest(
    {
      date: url.searchParams.get('date'),
      tz: url.searchParams.get('tz'),
      period: url.searchParams.get('period'),
    },
    getRepository(),
    getStateRepository(),
    DEV_USER_ID,
  );
  return Response.json(body, { status });
}
