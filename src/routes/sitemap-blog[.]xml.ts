import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { blogSitemapXml } from '@/lib/blog-sitemap';
import { baseLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { getLocalPosts, mergePosts } from '@/content/posts';

export const Route = createFileRoute('/sitemap-blog.xml')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { listPublishedArticles } =
            await import('@/modules/posts/service');
          const rows = envConfigs.database_url
            ? await listPublishedArticles()
            : [];
          const posts = mergePosts(
            rows.map((row) => ({
              slug: row.slug,
              title: row.title || row.slug,
              description: row.description || '',
              createdAt: new Date(row.createdAt).toISOString(),
              source: 'db' as const,
            })),
            getLocalPosts(baseLocale)
          );
          return new Response(
            blogSitemapXml(
              envConfigs.app_url,
              locales,
              posts.map((post) => post.slug),
              (url, locale) =>
                localizeUrl(url, { locale: locale as (typeof locales)[number] })
                  .href
            ),
            {
              headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'no-store',
              },
            }
          );
        } catch {
          return new Response('Sitemap temporarily unavailable', {
            status: 503,
            headers: { 'Cache-Control': 'no-store' },
          });
        }
      },
    },
  },
});
