import { handleCategoriesRequest } from '@/app/api/categories/handler';
import { resolveDataContext, UnauthorizedError, unauthorizedResponse } from '@/data/data-context';

export async function GET(): Promise<Response> {
  try {
    const { state, userId } = await resolveDataContext();
    const { status, body } = await handleCategoriesRequest(state, userId);
    return Response.json(body, { status });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    throw error;
  }
}
