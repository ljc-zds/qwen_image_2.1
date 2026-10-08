import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { hasPermission } from '@/modules/rbac/service';
import { getTrafficReport } from '@/modules/traffic/service';
import { respData, respErr } from '@/lib/resp';
import { isTrafficPath } from '@/lib/traffic';

export const Route = createFileRoute('/api/admin/analytics')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const headers = { 'Cache-Control': 'private, no-store' };
        const session = await getAuth().api.getSession({
          headers: request.headers,
        });
        if (!session?.user)
          return respErr('Unauthorized', { status: 401, headers });
        if (!(await hasPermission(session.user.id, 'admin.analytics.read')))
          return respErr('Forbidden', { status: 403, headers });
        const params = new URL(request.url).searchParams;
        const days = Number(params.get('days') || 7);
        const path = params.get('path') || '';
        if (![1, 7, 30, 90].includes(days) || (path && !isTrafficPath(path)))
          return respErr('Invalid filters', { status: 400, headers });
        try {
          return respData(await getTrafficReport(days, path), { headers });
        } catch {
          return respErr('Analytics unavailable', { status: 503, headers });
        }
      },
    },
  },
});
