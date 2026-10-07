import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';

export type StudioPageKind = 'home' | 'transparent' | 'editor' | 'prompts';
export function studioHead(
  page: StudioPageKind | 'landing' | 'pricing',
  path: string
) {
  const locale = getLocale();
  const title =
    page === 'pricing'
      ? m['studio.pricing.seo.title']()
      : page === 'landing'
        ? m['studio.home.seo.title']()
        : page === 'transparent'
          ? m['studio.seo.transparent']()
          : page === 'editor'
            ? m['studio.seo.editor']()
            : page === 'prompts'
              ? m['studio.seo.prompts']()
              : m['studio.seo.home']();
  const description =
    page === 'pricing'
      ? m['studio.pricing.seo.description']()
      : page === 'landing'
        ? m['studio.home.seo.description']()
        : page === 'transparent'
          ? m['studio.seo.description.transparent']()
          : page === 'editor'
            ? m['studio.seo.description.editor']()
            : page === 'prompts'
              ? m['studio.seo.description.prompts']()
              : m['studio.seo.description.home']();
  const base = envConfigs.app_url.replace(/\/$/, '');
  const urlFor = (loc: (typeof locales)[number], route = path) =>
    localizeUrl(base + route, { locale: loc }).href;
  const canonical = urlFor(locale);
  const image = base + '/og/prism-studio.png';
  const fullTitle = title + ' | ' + envConfigs.app_name;
  const websiteId = base + '/#website';
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebSite',
      '@id': websiteId,
      name: envConfigs.app_name,
      url: base + '/',
      inLanguage: ['en', 'zh'],
    },
    {
      '@type': 'WebPage',
      '@id': canonical + '#webpage',
      url: canonical,
      name: fullTitle,
      description,
      inLanguage: locale,
      isPartOf: { '@id': websiteId },
      primaryImageOfPage: {
        '@type': 'ImageObject',
        url: image,
        width: 1200,
        height: 630,
      },
    },
  ];
  if (path !== '/')
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: m['studio.home'](),
          item: urlFor(locale, '/'),
        },
        { '@type': 'ListItem', position: 2, name: title, item: canonical },
      ],
    });
  return {
    meta: [
      { title: fullTitle },
      { name: 'description', content: description },
      { name: 'robots', content: 'index,follow,max-image-preview:large' },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: envConfigs.app_name },
      { property: 'og:url', content: canonical },
      { property: 'og:locale', content: locale === 'zh' ? 'zh_CN' : 'en_US' },
      {
        property: 'og:locale:alternate',
        content: locale === 'zh' ? 'en_US' : 'zh_CN',
      },
      { property: 'og:image', content: image },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      {
        property: 'og:image:alt',
        content: 'Prism Studio — Qwen Image 2.1 creative workspace',
      },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      ...locales.map((loc) => ({
        rel: 'alternate',
        hrefLang: loc,
        href: urlFor(loc),
      })),
      { rel: 'alternate', hrefLang: 'x-default', href: urlFor('en') },
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': graph,
        }).replace(/</g, '\\u003c'),
      },
    ],
  };
}
