import { handleCommitMemories } from '@/app/api/memories/handler';
import { resolveDataContext, UnauthorizedError, unauthorizedResponse } from '@/data/data-context';

export async function POST(request: Request): Promise<Response> {
  try {
    const { events, userId } = await resolveDataContext();
    const body = await request.json().catch(() => null);
    const { status, body: payload } = await handleCommitMemories(body, events, userId);
    return Response.json(payload, { status });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    throw error;
  }
}
