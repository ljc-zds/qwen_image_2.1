import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createPublicPageCache, publicPageKey } from './public-page-cache';

const req = (path = '/', headers: Record<string, string> = {}) =>
  new Request('https://example.test' + path, {
    headers: { accept: 'text/html', ...headers },
  });
const html = (
  body = 'anonymous',
  headers: Record<string, string> = {},
  status = 200
) =>
  new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', ...headers },
  });

test('warm anonymous HTML skips rendering, expires, and separates locale and origin', async () => {
  let now = 0,
    calls = 0;
  const cache = createPublicPageCache(() => now);
  const render = async () => html('body-' + ++calls);
  assert.equal(
    (await cache(req(), render)).headers.get('x-public-page-cache'),
    'MISS'
  );
  assert.equal(await (await cache(req(), render)).text(), 'body-1');
  assert.equal(calls, 1);
  assert.equal(
    (await cache(req('/zh'), render)).headers.get('x-public-page-cache'),
    'MISS'
  );
  assert.equal(await (await cache(req(), render)).text(), 'body-1');
  assert.equal(calls, 2);
  assert.equal(
    publicPageKey(
      new Request('https://other.test/', { headers: { accept: 'text/html' } })
    ),
    'https://other.test/'
  );
  now = 60_001;
  await cache(req(), render);
  assert.equal(calls, 3);
});

test('warm anonymous response never reaches cookie, bearer, query, API or private requests', async () => {
  const cache = createPublicPageCache();
  await cache(req(), async () => html('anonymous'));
  for (const request of [
    req('/', { cookie: 'better-auth.session_token=user-a' }),
    req('/', { authorization: 'Bearer account-b' }),
    req('/?__tsr=x'),
    req('/?utm_source=test'),
    req('/', { range: 'bytes=0-100' }),
    req('/api/credits'),
    req('/my-creations'),
    req('/settings'),
    req('/', { 'x-tsr': 'server-fn' }),
    req('/', { rsc: '1' }),
    req('/', { 'sec-purpose': 'prefetch' }),
    req('/', { referer: 'https://other.test/' }),
  ]) {
    let called = false;
    const response = await cache(request, async () => {
      called = true;
      return html('personal');
    });
    assert.equal(called, true);
    assert.equal(await response.text(), 'personal');
    assert.equal(response.headers.get('x-public-page-cache'), 'BYPASS');
    assert.equal(
      response.headers.get('vercel-cdn-cache-control'),
      'private, no-store'
    );
  }
  assert.equal(
    await (await cache(req(), async () => html('should-not-run'))).text(),
    'anonymous'
  );
});

test('Set-Cookie, private, failures, variants and large/partial bodies never fill cache', async () => {
  for (const [headers, status, body] of [
    [{ 'set-cookie': 'session=secret' }, 200, 'private'],
    [{ 'cache-control': 'private' }, 200, 'private'],
    [{ 'cache-control': 'no-store' }, 200, 'private'],
    [{ vary: 'Cookie' }, 200, 'private'],
    [{}, 500, 'error'],
    [{}, 404, 'missing'],
    [{}, 200, 'x'.repeat(1024 * 1024 + 1)],
  ] as [Record<string, string>, number, string][]) {
    const cache = createPublicPageCache();
    let calls = 0;
    const render = async () => {
      calls++;
      return html(body, headers, status);
    };
    await cache(req(), render);
    await cache(req(), render);
    assert.equal(calls, 2);
  }
  const cache = createPublicPageCache();
  await cache(
    req(),
    async () =>
      new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode('partial'));
            c.error(new Error('SSR failed'));
          },
        }),
        { headers: { 'content-type': 'text/html' } }
      )
  );
  assert.equal(
    (await cache(req(), async () => html('complete'))).headers.get(
      'x-public-page-cache'
    ),
    'MISS'
  );
});

test('metadata has bounded CDN freshness while error and cookie responses do not', async () => {
  const cache = createPublicPageCache();
  for (const path of ['/robots.txt', '/sitemap.xml']) {
    const render = async () =>
      new Response('public metadata', {
        headers: { 'content-type': 'text/plain' },
      });
    assert.equal(
      (await cache(req(path), render)).headers.get('vercel-cdn-cache-control'),
      'public, s-maxage=60'
    );
    assert.equal(
      (await cache(req(path, { cookie: 'session=x' }), render)).headers.has(
        'vercel-cdn-cache-control'
      ),
      false
    );
    assert.equal(
      (
        await cache(
          req(path),
          async () => new Response('failure', { status: 503 })
        )
      ).headers.has('vercel-cdn-cache-control'),
      false
    );
  }
});
