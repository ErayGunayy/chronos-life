import { resolveDataContext, UnauthorizedError, unauthorizedResponse } from '@/data/data-context';
import { fail, ok } from '@/lib/api/envelope';

/** Real deletion, no friction (§5.11). */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { events, userId } = await resolveDataContext();
    const { id } = await context.params;
    const deleted = await events.deleteById(userId, id);
    return deleted
      ? Response.json(ok({ deleted: true }))
      : Response.json(fail('That memory was not found.'), { status: 404 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    throw error;
  }
}
