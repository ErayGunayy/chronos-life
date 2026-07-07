import { getExtractor } from '@/ai/get-extractor';
import { handleCaptureRequest } from '@/app/api/capture/handler';
import { requireUser, UnauthorizedError, unauthorizedResponse } from '@/data/data-context';

export async function POST(request: Request): Promise<Response> {
  try {
    await requireUser();
    const body = await request.json().catch(() => null);
    const { status, body: payload } = await handleCaptureRequest(body, getExtractor());
    return Response.json(payload, { status });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    throw error;
  }
}
