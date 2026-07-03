import { getExtractor } from '@/ai/get-extractor';
import { handleCaptureRequest } from '@/app/api/capture/handler';

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const { status, body: payload } = await handleCaptureRequest(body, getExtractor());
  return Response.json(payload, { status });
}
