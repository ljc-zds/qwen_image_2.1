import { createHash } from 'node:crypto';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { recordPageView } from '@/modules/traffic/service';
import { respErr, respOk } from '@/lib/resp';
import { isTrafficPath } from '@/lib/traffic';

const schema = z.object({
  id: z.string().uuid(),
  visitor: z.string().uuid(),
  path: z.string().max(100).refine(isTrafficPath),
});
const recent = new Map<string, number>();
export const Route = createFileRoute('/api/traffic')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const headers = { 'Cache-Control': 'no-store' };
        if (request.headers.get('origin') !== new URL(request.url).origin)
          return respErr('Forbidden', { status: 403, headers });
        if (
          /bot|crawler|spider|headless/i.test(
            request.headers.get('user-agent') || ''
          ) ||
          request.headers.get('dnt') === '1' ||
          request.headers.get('sec-gpc') === '1'
        )
          return respOk({ headers });
        if (!request.headers.get('content-type')?.includes('application/json'))
          return respErr('Invalid content type', { status: 415, headers });
        const reader = request.body?.getReader();
        if (!reader) return respErr('Invalid body', { status: 400, headers });
        let body = '';
        let size = 0;
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 1024) {
            await reader.cancel();
            return respErr('Too large', { status: 413, headers });
          }
          body += decoder.decode(value, { stream: true });
        }
        let input;
        try {
          input = schema.parse(JSON.parse(body));
        } catch {
          return respErr('Invalid event', { status: 400, headers });
        }
        const key = createHash('sha256')
          .update(
            request.headers.get('x-forwarded-for')?.split(',')[0] ||
              input.visitor
          )
          .digest('hex');
        const now = Date.now();
        if (now - (recent.get(key) || 0) < 500)
          return respErr('Rate limited', { status: 429, headers });
        if (recent.size > 10000) recent.clear();
        recent.set(key, now);
        try {
          await recordPageView(input);
          return respOk({ headers });
        } catch {
          return respErr('Analytics unavailable', { status: 503, headers });
        }
      },
    },
  },
});
