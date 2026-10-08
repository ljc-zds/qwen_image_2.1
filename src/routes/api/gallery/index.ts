import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { listArtworks } from '@/modules/gallery/service';
import { respData, respErr } from '@/lib/resp';

export const Route = createFileRoute('/api/gallery/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getAuth().api.getSession({
          headers: request.headers,
        });
        if (!session?.user) return respErr('Unauthorized', { status: 401 });
        const page = Number(new URL(request.url).searchParams.get('page') || 1);
        if (!Number.isSafeInteger(page) || page < 1 || page > 10000)
          return respErr('invalid_page', { status: 400 });
        return respData(await listArtworks(session.user.id, page), {
          headers: { 'Cache-Control': 'private, no-store' },
        });
      },
    },
  },
});
