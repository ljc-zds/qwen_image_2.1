import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () =>
        new Response(
          '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
            ['sitemap-static.xml', 'sitemap-blog.xml']
              .map(
                (path) =>
                  '<sitemap><loc>' +
                  envConfigs.app_url +
                  '/' +
                  path +
                  '</loc></sitemap>'
              )
              .join('') +
            '</sitemapindex>',
          { headers: { 'Content-Type': 'application/xml' } }
        ),
    },
  },
});
