import { getExtractor } from '@/ai/get-extractor';
import { handleCaptureRequest } from '@/app/api/capture/handler';
import { resolveRateLimiter, UnauthorizedError, unauthorizedResponse } from '@/data/data-context';

export async function POST(request: Request): Promise<Response> {
  try {
    const { userId, limiter } = await resolveRateLimiter();
    const body = await request.json().catch(() => null);
    const { status, body: payload } = await handleCaptureRequest(
      body,
      getExtractor(),
      limiter,
      userId,
    );
    return Response.json(payload, { status });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    throw error;
  }
}
