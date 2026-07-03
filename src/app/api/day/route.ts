import { getRepository } from '@/data/get-repository';
import { DEV_USER_ID } from '@/lib/dev-user';
import { handleDayRequest } from '@/app/api/day/handler';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const { status, body } = await handleDayRequest(
    { date: url.searchParams.get('date'), tz: url.searchParams.get('tz') },
    getRepository(),
    DEV_USER_ID,
  );
  return Response.json(body, { status });
}
