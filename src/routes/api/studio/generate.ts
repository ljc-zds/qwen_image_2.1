import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getDbConfigs } from '@/modules/config/service';
import {
  createStudioImage,
  isStudioReady,
  studioInput,
} from '@/modules/studio/service';
import { respData, respErr } from '@/lib/resp';

const activeUsers = new Set<string>();
const recentUsers = new Map<string, number>();

export const Route = createFileRoute('/api/studio/generate')({
  server: {
    handlers: {
      GET: () =>
        respData(
          { ready: isStudioReady() },
          { headers: { 'Cache-Control': 'no-store' } }
        ),
      POST: async ({ request }) => {
        const origin = request.headers.get('origin');
        if (origin && origin !== new URL(request.url).origin)
          return respErr('forbidden', { status: 403 });
        const session = await getAuth(await getDbConfigs()).api.getSession({
          headers: request.headers,
        });
        if (!session?.user) return respErr('unauthorized', { status: 401 });
        if (!isStudioReady()) return respErr('not_configured', { status: 503 });
        const userId = session.user.id;
        const now = Date.now();
        if (
          activeUsers.has(userId) ||
          now - (recentUsers.get(userId) || 0) < 30_000
        )
          return respErr('rate_limited', { status: 429 });
        if (Number(request.headers.get('content-length')) > 8_000_000)
          return respErr('request_too_large', { status: 413 });
        let input;
        try {
          const body = await request.text();
          if (body.length > 8_000_000)
            return respErr('request_too_large', { status: 413 });
          input = studioInput.parse(JSON.parse(body));
        } catch {
          return respErr('invalid_input', { status: 400 });
        }
        for (const [id, time] of recentUsers)
          if (now - time > 300_000) recentUsers.delete(id);
        recentUsers.set(userId, now);
        activeUsers.add(userId);
        try {
          return respData(await createStudioImage(input));
        } catch {
          return respErr('generation_failed', { status: 502 });
        } finally {
          activeUsers.delete(userId);
        }
      },
    },
  },
});
