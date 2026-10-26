import { useEffect } from 'react';

import { getCookieFromHeader } from './cookie';

// Static documents do not execute server.ts. Preserve its first-touch UTM
// semantics after hydration without sending a page-view request to a Function.
export function captureAttribution(
  url: string,
  cookie: string,
  write: (value: string) => void
) {
  const source = new URL(url).searchParams.get('utm_source');
  if (!source || getCookieFromHeader(cookie, 'utm_source')) return;
  const value = source.replace(/[^\w.\-]/g, '').slice(0, 100);
  if (value)
    write(`utm_source=${value}; Max-Age=2592000; Path=/; SameSite=Lax`);
}
export function ClientAttribution() {
  useEffect(() => {
    captureAttribution(window.location.href, document.cookie, (value) => {
      document.cookie = value;
    });
  }, []);
  return null;
}
