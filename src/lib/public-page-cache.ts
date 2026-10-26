// Cache only anonymous document responses inside this server instance. CDN HTML
// caching cannot safely distinguish a later authenticated request from an anonymous hit.
const PUBLIC_PAGES = new Set([
  '/',
  '/pricing',
  '/image-generator',
  '/image-editor',
  '/transparent-png',
  '/prompts',
  '/privacy-policy',
  '/terms-of-service',
]);
const METADATA = new Set(['/robots.txt', '/sitemap.xml']);
const PRIVATE = 'private, no-store';
type Entry = { body: Uint8Array; headers: [string, string][]; expires: number };
const MAX_BYTES = 1024 * 1024;

export function publicPageKey(request: Request): string | null {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/zh(?=\/|$)/, '') || '/';
  if (request.method !== 'GET' || url.search || !PUBLIC_PAGES.has(path))
    return null;
  if (
    request.headers.has('cookie') ||
    request.headers.has('authorization') ||
    request.headers.has('range')
  )
    return null;
  if (!(request.headers.get('accept') || '').includes('text/html')) return null;
  if (
    Array.from(request.headers.keys()).some((key) =>
      /^(?:x-tsr|x-tanstack|rsc|next-router|sec-purpose|purpose)/i.test(key)
    )
  )
    return null;
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      if (new URL(referer).origin !== url.origin) return null;
    } catch {
      return null;
    }
  }
  return url.origin + url.pathname; // Includes the locale prefix; queries never enter.
}

function privateResponse(response: Response, state: string): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', PRIVATE);
  headers.set('CDN-Cache-Control', PRIVATE);
  headers.set('Vercel-CDN-Cache-Control', PRIVATE);
  headers.set('X-Public-Page-Cache', state);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function boundedBody(response: Response): Promise<Uint8Array | null> {
  const reader = response.clone().body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > MAX_BYTES) {
        void reader.cancel();
        return null;
      }
      chunks.push(next.value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return body;
  } catch {
    return null;
  } // Never cache a rejected or incomplete SSR stream.
}

export function createPublicPageCache(now: () => number = Date.now) {
  const entries = new Map<string, Entry>();
  return async (
    request: Request,
    render: () => Promise<Response>
  ): Promise<Response> => {
    const key = publicPageKey(request);
    if (key) {
      const cached = entries.get(key);
      if (cached && cached.expires > now()) {
        entries.delete(key);
        entries.set(key, cached);
        return privateResponse(
          new Response(cached.body.slice(), { headers: cached.headers }),
          'HIT'
        );
      }
      entries.delete(key);
    }
    const response = await render();
    const url = new URL(request.url);
    const cacheControl = response.headers.get('cache-control') || '';
    const canStore =
      response.status === 200 &&
      !response.headers.has('set-cookie') &&
      !/private|no-store|no-cache/i.test(cacheControl) &&
      !response.headers.has('content-encoding') &&
      !response.headers.has('vary') &&
      (response.headers.get('content-type') || '').includes('text/html');
    if (key && canStore) {
      const body = await boundedBody(response);
      if (body) {
        entries.set(key, {
          body,
          headers: Array.from(response.headers.entries()),
          expires: now() + 60_000,
        });
        // Bounded to sixteen 1 MiB documents, with no user or query-string keys.
        while (entries.size > 16) entries.delete(entries.keys().next().value!);
        return privateResponse(response, 'MISS');
      }
    }
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      METADATA.has(url.pathname) &&
      !url.search &&
      !request.headers.has('cookie') &&
      !request.headers.has('authorization') &&
      !request.headers.has('range') &&
      response.status === 200 &&
      !response.headers.has('set-cookie') &&
      !/private|no-store|no-cache/i.test(cacheControl)
    ) {
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'public, max-age=0, s-maxage=60');
      headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=60');
      return new Response(response.body, { status: response.status, headers });
    }
    if ((response.headers.get('content-type') || '').includes('text/html'))
      return privateResponse(response, 'BYPASS');
    return response;
  };
}
export const withPublicPageCache = createPublicPageCache();
