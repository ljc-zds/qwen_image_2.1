import { readFileSync, writeFileSync } from 'node:fs';

const locales: string[] = JSON.parse(
  readFileSync(
    new URL('../project.inlang/settings.json', import.meta.url),
    'utf8'
  )
).locales;
const publicPaths = [
  '/',
  '/image-generator',
  '/transparent-png',
  '/image-editor',
  '/prompts',
  '/pricing',
  '/privacy-policy',
  '/terms-of-service',
];
export const staticPaths = locales.flatMap((locale) =>
  publicPaths.map((path) =>
    locale === 'en' ? path : `/${locale}${path === '/' ? '' : path}`
  )
);
export const metadataPaths = ['/robots.txt', '/sitemap.xml'];
const allowed = new Set([...staticPaths, ...metadataPaths]);
const records = new Map<string, string>();
export const staticPrerender = {
  enabled: true,
  autoStaticPathsDiscovery: false,
  crawlLinks: false,
  concurrency: 2,
  failOnError: true,
  retryCount: 0,
  maxRedirects: 2,
  headers: { accept: 'text/html' },
  filter: ({ path }: { path: string }) => allowed.has(path),
  onSuccess: ({ page, html }: { page: { path: string }; html: string }) => {
    if (!allowed.has(page.path)) throw new Error('Unexpected static route');
    if (
      !metadataPaths.includes(page.path) &&
      (!/<h1\b/i.test(html) || !/<title>[^<]+/i.test(html))
    )
      throw new Error('Incomplete static document: ' + page.path);
    records.set(
      page.path,
      metadataPaths.includes(page.path)
        ? page.path.slice(1)
        : page.path === '/'
          ? 'index.html'
          : page.path.slice(1) + '/index.html'
    );
    writeFileSync(
      '.static-pages.json',
      JSON.stringify(
        {
          expected: [...allowed],
          pages: Object.fromEntries(records),
        },
        null,
        2
      )
    );
  },
};
export const staticPageOptions = [...allowed].map((path) => ({
  path,
  prerender: {
    outputPath: metadataPaths.includes(path)
      ? path
      : path === '/'
        ? '/index.html'
        : path + '/index.html',
  },
}));
