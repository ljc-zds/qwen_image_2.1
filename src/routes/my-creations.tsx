import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ArrowRight, Download, ImagePlus, Menu, X } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { apiGet } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { getLocale, setLocale } from '@/paraglide/runtime.js';
import { StudioAccount } from '@/blocks/studio-account';
import { StudioLogin } from '@/blocks/studio-login';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

import '@/styles/studio.css';
import '@/styles/gallery.css';

type Artwork = { id: string; url: string; prompt: string; createdAt: string };
function CreationsPage() {
  const [page, setPage] = useState(1),
    [mobile, setMobile] = useState(false),
    [login, setLogin] = useState(false),
    [selected, setSelected] = useState<Artwork | null>(null);
  const { data: session, isPending: sessionLoading } = useSession();
  const query = useQuery({
    queryKey: ['gallery', session?.user?.id, page],
    queryFn: () =>
      apiGet<{ items: Artwork[]; hasMore: boolean }>(
        `/api/gallery/?page=${page}`
      ),
    enabled: Boolean(session?.user),
  });
  const nav = [
    ['/image-generator', m['studio.nav.create']()],
    ['/transparent-png', m['studio.nav.png']()],
    ['/image-editor', m['studio.nav.edit']()],
    ['/prompts', m['studio.nav.prompts']()],
    ['/pricing', m['studio.pricing.nav']()],
    ['/my-creations', m['gallery.title']()],
    ['/blog', m['blog.title']()],
  ];
  return (
    <div className="prism-site gallery-page">
      <header className="prism-header">
        <Link className="prism-brand" href="/">
          <img src="/logo.svg" width={30} height={30} alt="" />
          <span>
            {envConfigs.app_name}
            <small>{m['studio.brand_tag']()}</small>
          </span>
        </Link>
        <nav
          className={mobile ? 'prism-nav is-open' : 'prism-nav'}
          aria-label={m['studio.navigation']()}
        >
          {nav.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={href === '/my-creations' ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="prism-header-actions">
          <button
            className="language-button"
            onClick={() => setLocale(getLocale() === 'en' ? 'zh' : 'en')}
          >
            {getLocale() === 'en' ? '中文' : 'EN'}
          </button>
          <StudioAccount onSignIn={() => setLogin(true)} />
          <button
            className="mobile-menu"
            aria-label={m['studio.menu']()}
            aria-expanded={mobile}
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      <main className="gallery-main">
        <section className="gallery-heading">
          <div>
            <span className="gallery-eyebrow">{m['gallery.eyebrow']()}</span>
            <h1>{m['gallery.title']()}</h1>
            <p>{m['gallery.subtitle']()}</p>
          </div>
          <Link className="gallery-create" href="/image-generator">
            <ImagePlus size={18} />
            {m['gallery.create']()}
            <ArrowRight size={16} />
          </Link>
        </section>
        <div className="gallery-toolbar">
          <strong>{m['gallery.all']()}</strong>
          <span>{m['gallery.private']()}</span>
        </div>
        {sessionLoading || (session?.user && query.isPending) ? (
          <p className="gallery-state">{m['gallery.loading']()}</p>
        ) : !session?.user ? (
          <div className="gallery-state">
            <ImagePlus size={40} />
            <h2>{m['gallery.signin_title']()}</h2>
            <p>{m['gallery.signin_copy']()}</p>
            <button className="gallery-create" onClick={() => setLogin(true)}>
              {m['studio.signin']()}
            </button>
          </div>
        ) : query.isError ? (
          <div className="gallery-state" role="alert">
            <p>{m['gallery.error']()}</p>
            <button onClick={() => query.refetch()}>
              {m['gallery.retry']()}
            </button>
          </div>
        ) : !query.data?.items.length ? (
          <div className="gallery-state">
            <ImagePlus size={40} />
            <h2>{m['gallery.empty_title']()}</h2>
            <p>{m['gallery.empty']()}</p>
            <Link className="gallery-create" href="/image-generator">
              {m['gallery.create']()}
            </Link>
          </div>
        ) : (
          <div className="gallery-grid">
            {query.data.items.map((item) => (
              <article className="gallery-card" key={item.id}>
                <button
                  className="gallery-image"
                  onClick={() => setSelected(item)}
                  aria-label={m['gallery.open']()}
                >
                  <img src={item.url} alt={item.prompt} loading="lazy" />
                  <span>
                    {m['gallery.open']()} <ArrowRight size={16} />
                  </span>
                </button>
                <div className="gallery-caption">
                  <p>{item.prompt}</p>
                  <div>
                    <time dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleDateString(
                        getLocale() === 'zh' ? 'zh-CN' : 'en-US'
                      )}
                    </time>
                    <a
                      href={`${item.url}?download=1`}
                      aria-label={m['gallery.download']()}
                    >
                      <Download size={17} />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {session?.user && (page > 1 || query.data?.hasMore) && (
          <div className="gallery-pagination">
            <button
              disabled={page === 1 || query.isFetching}
              onClick={() => setPage(page - 1)}
            >
              {m['gallery.previous']()}
            </button>
            <span>{page}</span>
            <button
              disabled={!query.data?.hasMore || query.isFetching}
              onClick={() => setPage(page + 1)}
            >
              {m['gallery.next']()}
            </button>
          </div>
        )}
      </main>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="gallery-detail">
          {selected && (
            <>
              <DialogTitle>{m['gallery.detail']()}</DialogTitle>
              <img src={selected.url} alt={selected.prompt} />
              <DialogDescription>{selected.prompt}</DialogDescription>
              <a className="gallery-create" href={`${selected.url}?download=1`}>
                <Download size={18} />
                {m['gallery.download']()}
              </a>
            </>
          )}
        </DialogContent>
      </Dialog>
      <StudioLogin open={login} onOpenChange={setLogin} />
    </div>
  );
}
export const Route = createFileRoute('/my-creations')({
  head: () => ({
    meta: [
      { title: 'My creations | Prism Studio' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: CreationsPage,
});
