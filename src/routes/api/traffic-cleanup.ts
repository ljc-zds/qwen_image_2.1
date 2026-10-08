import { timingSafeEqual } from 'node:crypto';
import { createFileRoute } from '@tanstack/react-router';

import { pruneTraffic } from '@/modules/traffic/service';
import { respErr, respOk } from '@/lib/resp';

export const Route = createFileRoute('/api/traffic-cleanup')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const supplied = request.headers.get('authorization') || '';
        const expected = 'Bearer ' + secret;
        if (
          !secret ||
          Buffer.byteLength(supplied) !== Buffer.byteLength(expected) ||
          !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
        )
          return respErr('Unauthorized', { status: 401 });
        await pruneTraffic();
        return respOk({ headers: { 'Cache-Control': 'no-store' } });
      },
    },
  },
});
