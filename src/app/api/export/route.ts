import { getRepository } from '@/data/get-repository';
import { toJsonExport } from '@/data/export/to-json';
import { toMarkdownExport } from '@/data/export/to-markdown';
import { fail } from '@/lib/api/envelope';
import { DEV_USER_ID } from '@/lib/dev-user';

/**
 * Full export at any time (§5.11): memories stay readable without Chronos.
 * JSON round-trips losslessly; Markdown is the human-durable form.
 */
export async function GET(request: Request): Promise<Response> {
  const format = new URL(request.url).searchParams.get('format') ?? 'json';
  if (format !== 'json' && format !== 'markdown') {
    return Response.json(fail('format must be json or markdown'), { status: 400 });
  }

  const events = await getRepository().listAll(DEV_USER_ID);
  const exportedAt = new Date().toISOString();

  if (format === 'json') {
    return new Response(toJsonExport(events, { exportedAt }), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="chronos-memories.json"',
      },
    });
  }

  return new Response(toMarkdownExport(events, { exportedAt }), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'attachment; filename="chronos-memories.md"',
    },
  });
}
