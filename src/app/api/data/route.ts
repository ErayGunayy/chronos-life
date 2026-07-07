import { handleDeleteAllData } from '@/app/api/data/handler';
import { resolveDataContext, UnauthorizedError, unauthorizedResponse } from '@/data/data-context';

export async function DELETE(): Promise<Response> {
  try {
    const { events, state, userId } = await resolveDataContext();
    const { status, body } = await handleDeleteAllData(events, state, userId);
    return Response.json(body, { status });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    throw error;
  }
}
