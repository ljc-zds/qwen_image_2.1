import { timingSafeEqual } from 'node:crypto';
import { createFileRoute } from '@tanstack/react-router';

import { drainWaffoInbox } from '@/modules/payment/waffo-service';
import { respErr, respOk } from '@/lib/resp';

export const Route = createFileRoute('/api/payment/retry')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const expected = process.env.CRON_SECRET;
        const supplied = request.headers.get('authorization') || '';
        const target = expected ? 'Bearer ' + expected : '';
        if (
          !expected ||
          Buffer.byteLength(supplied) !== Buffer.byteLength(target) ||
          !timingSafeEqual(Buffer.from(supplied), Buffer.from(target))
        )
          return respErr('Unauthorized', { status: 401 });
        await drainWaffoInbox();
        return respOk();
      },
    },
  },
});
