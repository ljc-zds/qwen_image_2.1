import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { deleteArtwork, readArtwork } from '@/modules/gallery/service';
import { respData, respErr } from '@/lib/resp';

export const Route = createFileRoute('/api/gallery/$id')({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        if (request.headers.get('origin') !== new URL(request.url).origin)
          return respErr('forbidden', { status: 403 });
        const session = await getAuth().api.getSession({
          headers: request.headers,
        });
        if (!session?.user) return respErr('Unauthorized', { status: 401 });
        try {
          if (!(await deleteArtwork(session.user.id, params.id)))
            return respErr('not_found', { status: 404 });
          return respData(
            { deleted: true },
            { headers: { 'Cache-Control': 'private, no-store' } }
          );
        } catch {
          return respErr('gallery_delete_failed', { status: 502 });
        }
      },
      GET: async ({ request, params }) => {
        const session = await getAuth().api.getSession({
          headers: request.headers,
        });
        if (!session?.user) return respErr('Unauthorized', { status: 401 });
        const result = await readArtwork(session.user.id, params.id);
        if (!result) return respErr('not_found', { status: 404 });
        const download =
          new URL(request.url).searchParams.get('download') === '1';
        return new Response(result.body, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
            'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="qwen-image.png"`,
          },
        });
      },
    },
  },
});
