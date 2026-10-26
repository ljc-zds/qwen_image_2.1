import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  finalizeStatic,
  staticRules,
  TRANSPORT_HEADERS,
  TRANSPORT_QUERIES,
} from './finalize-static.mjs';

const pages = {
  '/': 'index.html',
  '/zh': 'zh/index.html',
  '/guide': 'guide/index.html',
  '/robots.txt': 'robots.txt',
};
const rules = staticRules(pages);
function target(path, method = 'GET', headers = {}, query = {}) {
  return rules.find(
    (rule) =>
      new RegExp(rule.src).test(path) &&
      (!rule.methods || rule.methods.includes(method)) &&
      (!rule.has ||
        rule.has.every((condition) => {
          const value = (condition.type === 'header' ? headers : query)[
            condition.key
          ];
          return (
            value !== undefined &&
            (!condition.value || new RegExp(condition.value).test(value))
          );
        }))
  )?.dest;
}
test('document GET/HEAD and locale routes resolve to exact static files, including cookie-bearing viewers', () => {
  assert.equal(target('/'), '/index.html');
  assert.equal(target('/zh', 'HEAD'), '/zh/index.html');
  assert.equal(target('/guide/'), '/guide/index.html');
  assert.equal(
    target(
      '/',
      'GET',
      { cookie: 'session=viewer-a', authorization: 'Bearer viewer-b' },
      { utm_source: 'launch' }
    ),
    '/index.html'
  );
  assert.equal(target('/settings'), undefined);
  assert.equal(target('/api/auth/get-session'), undefined);
  assert.equal(target('/unknown'), undefined);
});
test('RPC/data transport and mutations reach the original server before static aliases', () => {
  for (const key of TRANSPORT_HEADERS)
    assert.equal(target('/', 'GET', { [key]: '1' }), '/__server');
  for (const key of TRANSPORT_QUERIES)
    assert.equal(target('/guide', 'GET', {}, { [key]: '1' }), '/__server');
  assert.equal(target('/', 'GET', { accept: 'application/json' }), '/__server');
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
    assert.equal(target('/guide', method), '/__server');
});
test('private, CMS and query-bearing paths cannot become static inventory', () => {
  for (const path of [
    '/api/credits',
    '/zh/settings',
    '/admin',
    '/_serverFn/id',
    '/my-creations',
    '/orders',
    '/blog/a',
    '/?secret=x',
  ])
    assert.throws(() => staticRules({ [path]: 'index.html' }));
});
test('build verifier fails closed when any expected file is missing', () => {
  const root = mkdtempSync(join(tmpdir(), 'static-gate-'));
  try {
    mkdirSync(join(root, '.output/public'), { recursive: true });
    writeFileSync(
      join(root, '.static-pages.json'),
      JSON.stringify({ expected: ['/'], pages: { '/': 'index.html' } })
    );
    assert.throws(() => finalizeStatic(root), /Missing static artifact/);
    writeFileSync(
      join(root, '.static-pages.json'),
      JSON.stringify({
        expected: ['/', '/guide'],
        pages: { '/': 'index.html' },
      })
    );
    assert.throws(() => finalizeStatic(root), /Missing prerendered page/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
