import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { locales, localizeUrl } from '@/paraglide/runtime.js';

const paths = [
  '/',
  '/image-generator',
  '/transparent-png',
  '/image-editor',
  '/prompts',
  '/pricing',
  '/privacy-policy',
  '/terms-of-service',
];
const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        const urlFor = (path: string, locale: (typeof locales)[number]) =>
          escapeXml(localizeUrl(envConfigs.app_url + path, { locale }).href);
        const entries = paths.flatMap((path) =>
          locales.map((locale) =>
            [
              '<url><loc>' + urlFor(path, locale) + '</loc>',
              ...locales.map(
                (alternate) =>
                  '<xhtml:link rel="alternate" hreflang="' +
                  alternate +
                  '" href="' +
                  urlFor(path, alternate) +
                  '"/>'
              ),
              '<changefreq>weekly</changefreq><priority>' +
                (path === '/' ? '1.0' : '0.8') +
                '</priority></url>',
            ].join('')
          )
        );
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' +
            entries.join('') +
            '</urlset>',
          { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
        );
      },
    },
  },
});
