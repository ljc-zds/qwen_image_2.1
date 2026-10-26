export function blogSitemapXml(
  host: string,
  locales: readonly string[],
  slugs: readonly string[],
  localize: (url: string, locale: string) => string
): string {
  const escape = (value: string) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  const paths = ['/blog', ...slugs.map((slug) => '/blog/' + slug)];
  const urls = paths.flatMap((path) =>
    locales.map(
      (locale) =>
        '<url><loc>' + escape(localize(host + path, locale)) + '</loc></url>'
    )
  );
  return (
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    urls.join('') +
    '</urlset>'
  );
}
