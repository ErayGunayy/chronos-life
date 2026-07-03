import { getRepository } from '@/data/get-repository';
import { DEV_USER_ID } from '@/lib/dev-user';
import { handleCommitMemories } from '@/app/api/memories/handler';

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const { status, body: payload } = await handleCommitMemories(
    body,
    getRepository(),
    DEV_USER_ID,
  );
  return Response.json(payload, { status });
}
