import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getBalance, getHistory } from '@/modules/credits/service';
import { respData, respErr } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return respErr('Unauthorized', {
        status: 401,
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }

    if (new URL(request.url).searchParams.get('summary') === '1') {
      return respData(
        { balance: await getBalance(session.user.id) },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    }
    const [balance, history] = await Promise.all([
      getBalance(session.user.id),
      getHistory(session.user.id),
    ]);

    return respData(
      { balance, history },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error: any) {
    return respErr(error.message || 'Failed to get credits');
  }
}

export const Route = createFileRoute('/api/credits')({
  server: {
    handlers: { GET },
  },
});
