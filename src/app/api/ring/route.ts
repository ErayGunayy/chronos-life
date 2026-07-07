import { handleRingRequest } from '@/app/api/ring/handler';
import { resolveDataContext, UnauthorizedError, unauthorizedResponse } from '@/data/data-context';

export async function GET(request: Request): Promise<Response> {
  try {
    const { events, state, userId } = await resolveDataContext();
    const url = new URL(request.url);
    const { status, body } = await handleRingRequest(
      {
        date: url.searchParams.get('date'),
        tz: url.searchParams.get('tz'),
        period: url.searchParams.get('period'),
      },
      events,
      state,
      userId,
    );
    return Response.json(body, { status });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    throw error;
  }
}
