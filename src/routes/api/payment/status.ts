import { createFileRoute } from '@tanstack/react-router';

import {
  waffoEnvironment,
  waffoProductId,
  waffoReady,
} from '@/core/payment/waffo';
import { respData } from '@/lib/resp';

export const Route = createFileRoute('/api/payment/status')({
  server: {
    handlers: {
      GET: () => {
        let ready = waffoReady();
        try {
          for (const sku of ['creator_monthly', 'pro_monthly', 'image_pack'])
            waffoProductId(sku);
        } catch {
          ready = false;
        }
        return respData(
          { ready, environment: waffoEnvironment(), provider: 'waffo' },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      },
    },
  },
});
