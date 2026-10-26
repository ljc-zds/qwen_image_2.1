import assert from 'node:assert/strict';
import { test } from 'node:test';

import { captureAttribution } from './client-attribution';

test('static landing captures only sanitized first-touch UTM source', () => {
  const writes: string[] = [];
  captureAttribution(
    'https://example.test/?utm_source=launch%3Cscript%3E',
    '',
    (x) => writes.push(x)
  );
  assert.deepEqual(writes, [
    'utm_source=launchscript; Max-Age=2592000; Path=/; SameSite=Lax',
  ]);
  captureAttribution(
    'https://example.test/?utm_source=second',
    'utm_source=first',
    (x) => writes.push(x)
  );
  assert.equal(writes.length, 1);
});
test('missing or empty attribution does not create cookies', () => {
  const writes: string[] = [];
  for (const url of [
    'https://example.test/',
    'https://example.test/?utm_source=%3C%3E',
  ])
    captureAttribution(url, '', (x) => writes.push(x));
  assert.equal(writes.length, 0);
});
