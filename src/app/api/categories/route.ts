import { handleCategoriesRequest } from '@/app/api/categories/handler';
import { getStateRepository } from '@/data/get-state-repository';
import { DEV_USER_ID } from '@/lib/dev-user';

export async function GET(): Promise<Response> {
  const { status, body } = await handleCategoriesRequest(getStateRepository(), DEV_USER_ID);
  return Response.json(body, { status });
}
