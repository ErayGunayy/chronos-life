import { getRepository } from '@/data/get-repository';
import { fail, ok } from '@/lib/api/envelope';
import { DEV_USER_ID } from '@/lib/dev-user';

/** Real deletion, no friction (§5.11). */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const deleted = await getRepository().deleteById(DEV_USER_ID, id);
  return deleted
    ? Response.json(ok({ deleted: true }))
    : Response.json(fail('That memory was not found.'), { status: 404 });
}
