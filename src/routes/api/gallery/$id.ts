import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { readArtwork } from '@/modules/gallery/service';
import { respErr } from '@/lib/resp';

export const Route = createFileRoute('/api/gallery/$id')({
  server: {
    handlers: {
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
