import { handleDayRequest } from '@/app/api/day/handler';
import { resolveDataContext, UnauthorizedError, unauthorizedResponse } from '@/data/data-context';

export async function GET(request: Request): Promise<Response> {
  try {
    const { events, userId } = await resolveDataContext();
    const url = new URL(request.url);
    const { status, body } = await handleDayRequest(
      { date: url.searchParams.get('date'), tz: url.searchParams.get('tz') },
      events,
      userId,
    );
    return Response.json(body, { status });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    throw error;
  }
}
