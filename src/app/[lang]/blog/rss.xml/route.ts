import { siteOrigin } from '@/data/site';
import { getDictionary, isLocale, localeInfo, localePath, locales } from '@/i18n';
import { getPosts } from '@/lib/blog/posts';

/*
  The RSS feed of one language, written at build time. Each item carries the summary, not
  the whole post: readers come to the site to read it.
*/
export const dynamic = 'force-static';
export const dynamicParams = false;
export const generateStaticParams = () => locales.map(lang => ({ lang }));

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET(_request: Request, { params }: RouteContext<'/[lang]/blog/rss.xml'>) {
  const { lang } = await params;
  if (!isLocale(lang)) return new Response('Not found', { status: 404 });
  const t = getDictionary(lang).blog;
  const origin = siteOrigin();
  const posts = getPosts(lang).filter(post => !post.draft);
  const items = posts.map(post => {
    const url = origin + localePath(lang, post.path);
    return `    <item>
      <title>${escape(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${post.date.toUTCString()}</pubDate>
      <description>${escape(post.description)}</description>
      <category>${escape(t.kinds[post.kind])}</category>
${post.tags.map(tag => `      <category>${escape(tag)}</category>`).join('\n')}
    </item>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(t.meta.title)}</title>
    <link>${origin}${localePath(lang, '/blog')}</link>
    <atom:link href="${origin}${localePath(lang, '/blog/rss.xml')}" rel="self" type="application/rss+xml" />
    <description>${escape(t.meta.description)}</description>
    <language>${localeInfo[lang].html}</language>
${items.join('\n')}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
