// Run with the SQLite schema selected: node --import tsx scripts/check-traffic.mjs
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';

const dir = await mkdtemp(join(tmpdir(), 'prism-traffic-'));
process.env.DATABASE_PROVIDER = 'sqlite';
process.env.DATABASE_URL = 'file:' + join(dir, 'test.db').replaceAll('\\', '/');
process.env.AUTH_SECRET = randomUUID();
const client = createClient({ url: process.env.DATABASE_URL });
try {
  await client.execute(
    'CREATE TABLE page_view (id TEXT PRIMARY KEY, visitor_hash TEXT NOT NULL, path TEXT NOT NULL, day TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()*1000))'
  );
  const { recordPageView, getTrafficReport, trafficDay, pruneTraffic } =
    await import('../src/modules/traffic/service.ts');
  assert.equal(trafficDay(new Date('2026-10-06T16:00:00Z')), '2026-10-07');
  const visitor = randomUUID(),
    id = randomUUID();
  await recordPageView({ id, visitor, path: '/' });
  await recordPageView({ id, visitor, path: '/' });
  await recordPageView({ id: randomUUID(), visitor, path: '/pricing' });
  await recordPageView({ id: randomUUID(), visitor: randomUUID(), path: '/' });
  const report = await getTrafficReport(7, '');
  assert.equal(report.visitors, 2);
  assert.equal(report.views, 3);
  assert.equal(report.daily.length, 7);
  const homepage = await getTrafficReport(7, '/');
  assert.equal(homepage.views, 2);
  assert.equal(homepage.visitors, 2);
  const stored = await client.execute('SELECT visitor_hash FROM page_view');
  assert.ok(stored.rows.every((r) => r.visitor_hash !== visitor));
  const old = Date.now() - 92 * 86400000;
  await client.execute({
    sql: 'INSERT INTO page_view VALUES (?,?,?,?,?)',
    args: [randomUUID(), 'old', '/', trafficDay(new Date(old)), old],
  });
  await pruneTraffic();
  assert.equal(
    Number(
      (await client.execute('SELECT count(*) AS n FROM page_view')).rows[0].n
    ),
    3
  );
  const { Route } = await import('../src/routes/api/traffic.ts');
  const post = Route.options.server.handlers.POST;
  const req = (payload, headers = {}) => ({
    request: new Request('https://example.com/api/traffic', {
      method: 'POST',
      headers: {
        origin: 'https://example.com',
        'content-type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    }),
  });
  const event = { id: randomUUID(), visitor: randomUUID(), path: '/' };
  assert.equal(
    (await post(req(event, { origin: 'https://evil.example' }))).status,
    403
  );
  assert.equal((await post(req({ ...event, path: '/admin' }))).status, 400);
  assert.equal(
    (await post(req({ ...event, path: '/?email=private' }))).status,
    400
  );
  assert.equal((await post(req(event, { dnt: '1' }))).status, 200);
  assert.equal((await getTrafficReport(1, '')).views, 3);
  assert.equal((await post(req(event))).status, 200);
  assert.equal((await getTrafficReport(1, '')).views, 4);
  console.log(
    'PASS: unique visitors, deduplication, path filtering, timezone, hashed identifiers, retention, origin validation, private-path rejection, DNT, collection.'
  );
} finally {
  const { db } = await import('../src/core/db/index.ts');
  db().$client.close();
  client.close(); /* Windows libsql releases file handles on process exit; keep this isolated temp fixture. */
}
