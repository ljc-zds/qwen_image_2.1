import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const TRANSPORT_HEADERS = [
  'x-tsr',
  'x-tsr-serverfn',
  'x-tsr-redirect',
  'x-tanstack-start-data',
  'rsc',
  'next-router-state-tree',
];
export const TRANSPORT_QUERIES = [
  '__tsr',
  '_tsr',
  '_data',
  '_rsc',
  '_serverFn',
];
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function staticRules(pages) {
  const paths = Object.keys(pages);
  if (
    !paths.length ||
    paths.some(
      (p) =>
        !p.startsWith('/') ||
        /(?:^|\/)(?:api|admin|settings|_serverFn|sign-in|sign-up|my-creations|orders|blog)(?:\/|$)/.test(
          p
        ) ||
        /[?#]/.test(p)
    )
  )
    throw new Error('Unsafe static route inventory');
  const src =
    '^(?:' + paths.map((p) => escape(p === '/' ? '' : p)).join('|') + ')/?$';
  const transports = [
    ...TRANSPORT_HEADERS.map((key) => ({ type: 'header', key })),
    ...TRANSPORT_QUERIES.map((key) => ({ type: 'query', key })),
    {
      type: 'header',
      key: 'accept',
      value: '.*(?:application/json|text/x-component).*',
    },
  ].map((condition) => ({ src, dest: '/__server', has: [condition] }));
  return [
    ...transports,
    {
      src,
      methods: ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      dest: '/__server',
    },
    ...paths.map((path) => ({
      src: '^' + escape(path === '/' ? '' : path) + '/?$',
      methods: ['GET', 'HEAD'],
      dest: '/' + pages[path],
      headers: {
        'X-Static-Page': 'build',
        'Cache-Control': 'public, max-age=0, s-maxage=3600',
      },
    })),
  ];
}
export function finalizeStatic(root = process.cwd()) {
  const manifest = JSON.parse(
    readFileSync(join(root, '.static-pages.json'), 'utf8')
  );
  for (const path of manifest.expected)
    if (!manifest.pages[path])
      throw new Error('Missing prerendered page: ' + path);
  const staticDir = existsSync(join(root, '.vercel/output/static'))
    ? join(root, '.vercel/output/static')
    : join(root, '.output/public');
  for (const [path, file] of Object.entries(manifest.pages)) {
    if (file.includes('..') || !existsSync(join(staticDir, file)))
      throw new Error('Missing static artifact: ' + path);
    const body = readFileSync(join(staticDir, file), 'utf8');
    if (
      file.endsWith('.html') &&
      (!/<h1\b/i.test(body) ||
        !/<title>[^<]+/i.test(body) ||
        !/<script\b/i.test(body))
    )
      throw new Error('Incomplete hydrated static artifact: ' + path);
    if (
      /better-auth\.session_token|access_token|refresh_token|DATABASE_URL|AUTH_SECRET/.test(
        body
      )
    )
      throw new Error('Private value marker in static artifact: ' + path);
  }
  const host = process.env.VITE_APP_URL;
  if (!host || !/^https:\/\//.test(host))
    throw new Error(
      'Set public VITE_APP_URL before generating the static sitemap'
    );
  const escapeXml = (value) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  const urls = Object.entries(manifest.pages)
    .filter(([, file]) => file.endsWith('.html'))
    .map(
      ([path]) =>
        '<url><loc>' +
        escapeXml(host.replace(/\/$/, '') + path) +
        '</loc></url>'
    );
  writeFileSync(
    join(staticDir, 'sitemap-static.xml'),
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      urls.join('') +
      '</urlset>'
  );
  manifest.pages['/sitemap-static.xml'] = 'sitemap-static.xml';
  const configPath = join(root, '.vercel/output/config.json');
  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    const position = config.routes.findIndex(
      (route) => route.handle === 'filesystem'
    );
    if (
      position < 0 ||
      config.routes.slice(0, position).some((route) => route.middlewarePath)
    )
      throw new Error('Static routes would not precede middleware/server');
    config.routes.splice(position, 0, ...staticRules(manifest.pages));
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    // Read back the exact serialized output used by Vercel, not an in-memory plan.
    const final = JSON.parse(readFileSync(configPath, 'utf8'));
    const fsIndex = final.routes.findIndex(
      (route) => route.handle === 'filesystem'
    );
    for (const [path, file] of Object.entries(manifest.pages)) {
      const index = final.routes.findIndex(
        (route) =>
          route.dest === '/' + file &&
          route.headers?.['X-Static-Page'] === 'build'
      );
      if (index < 0 || index >= fsIndex)
        throw new Error('Static alias is behind filesystem: ' + path);
    }
  }
  console.log(
    'Verified build-time static artifacts and routing:',
    Object.keys(manifest.pages).length
  );
  return manifest;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)
)
  finalizeStatic();
