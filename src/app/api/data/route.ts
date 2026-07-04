import { handleDeleteAllData } from '@/app/api/data/handler';
import { getRepository } from '@/data/get-repository';
import { getStateRepository } from '@/data/get-state-repository';
import { DEV_USER_ID } from '@/lib/dev-user';

export async function DELETE(): Promise<Response> {
  const { status, body } = await handleDeleteAllData(
    getRepository(),
    getStateRepository(),
    DEV_USER_ID,
  );
  return Response.json(body, { status });
}
