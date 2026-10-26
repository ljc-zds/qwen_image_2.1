import assert from 'node:assert/strict';
import { test } from 'node:test';

import { blogSitemapXml } from './blog-sitemap';

const localize = (url: string, locale: string) =>
  locale === 'en'
    ? url
    : new URL(url).origin + '/' + locale + new URL(url).pathname;
test('live blog sitemap keeps the index in every locale even with no posts', () => {
  const xml = blogSitemapXml(
    'https://example.test',
    ['en', 'zh'],
    [],
    localize
  );
  assert(xml.includes('<loc>https://example.test/blog</loc>'));
  assert(xml.includes('<loc>https://example.test/zh/blog</loc>'));
  assert.equal((xml.match(/<loc>/g) || []).length, 2);
});
test('published articles coexist with index entries and XML values are escaped', () => {
  const xml = blogSitemapXml(
    'https://example.test',
    ['en', 'zh'],
    ['new-post', 'a&b'],
    localize
  );
  assert.equal((xml.match(/<loc>/g) || []).length, 6);
  assert(xml.includes('/blog/new-post</loc>'));
  assert(xml.includes('/zh/blog/a&amp;b</loc>'));
});
