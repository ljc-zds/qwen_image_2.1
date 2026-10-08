import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';

import { apiPost } from '@/lib/api-client';
import { isTrafficPath } from '@/lib/traffic';

export function FirstPartyAnalytics() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const last = useRef('');
  const { mutate } = useMutation({
    mutationFn: (event: { id: string; visitor: string; path: string }) =>
      apiPost('/api/traffic', event),
    retry: false,
  });
  useEffect(() => {
    const publicPath = window.location.pathname;
    if (last.current === pathname) return;
    last.current = pathname;
    if (
      !isTrafficPath(publicPath) ||
      navigator.doNotTrack === '1' ||
      (navigator as Navigator & { globalPrivacyControl?: boolean })
        .globalPrivacyControl
    )
      return;
    let visitor: string;
    try {
      const saved = JSON.parse(
        localStorage.getItem('prism_anonymous_visitor') || 'null'
      );
      if (
        saved &&
        typeof saved.id === 'string' &&
        Date.now() - saved.created < 90 * 86400000
      )
        visitor = saved.id;
      else {
        visitor = crypto.randomUUID();
        localStorage.setItem(
          'prism_anonymous_visitor',
          JSON.stringify({ id: visitor, created: Date.now() })
        );
      }
    } catch {
      return;
    }
    mutate({ id: crypto.randomUUID(), visitor, path: publicPath });
  }, [pathname, mutate]);
  return null;
}
