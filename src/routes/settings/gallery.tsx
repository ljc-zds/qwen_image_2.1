import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { Link } from '@/core/i18n/navigation';
import { apiGet } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';

type Artwork = { id: string; url: string; prompt: string; createdAt: string };
function GalleryPage() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['gallery', page],
    queryFn: () =>
      apiGet<{ items: Artwork[]; hasMore: boolean }>(
        `/api/gallery/?page=${page}`
      ),
  });
  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{m['gallery.title']()}</h1>
      <p className="text-muted-foreground">{m['gallery.description']()}</p>
      <Link href="/image-generator">{m['gallery.create']()} →</Link>
      {query.isPending ? (
        <p>{m['gallery.loading']()}</p>
      ) : query.isError ? (
        <p role="alert">{m['gallery.error']()}</p>
      ) : !query.data?.items.length ? (
        <p>{m['gallery.empty']()}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {query.data.items.map((item) => (
            <article
              key={item.id}
              className="bg-card overflow-hidden rounded-xl border"
            >
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <img
                  className="aspect-square w-full object-contain"
                  src={item.url}
                  alt={item.prompt}
                  loading="lazy"
                />
              </a>
              <div className="space-y-3 p-4">
                <p className="line-clamp-3 text-sm">{item.prompt}</p>
                <time className="text-muted-foreground text-sm">
                  {new Date(item.createdAt).toLocaleString()}
                </time>
                <div>
                  <a href={`${item.url}?download=1`} className="underline">
                    {m['gallery.download']()}
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <Button
          variant="outline"
          disabled={page === 1 || query.isFetching}
          onClick={() => setPage(page - 1)}
        >
          {m['gallery.previous']()}
        </Button>
        <Button
          variant="outline"
          disabled={!query.data?.hasMore || query.isFetching}
          onClick={() => setPage(page + 1)}
        >
          {m['gallery.next']()}
        </Button>
      </div>
    </div>
  );
}
export const Route = createFileRoute('/settings/gallery')({
  component: GalleryPage,
});
