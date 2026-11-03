import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Arrow } from '@/components/arrow';
import { fill, isoDay, longDate } from '@/components/blog/format';
import { TagList } from '@/components/blog/post-list';
import { credits, site, siteOrigin } from '@/data/site';
import { getDictionary, isLocale, localeInfo, localePath, locales, type Locale } from '@/i18n';
import { renderPost } from '@/lib/blog/markdown';
import { getPost, getPosts } from '@/lib/blog/posts';

/*
  One post. Everything is HTML from the build: the Markdown rendered by lib/blog/markdown.ts,
  "On this page" from its headings, and no script of its own.
  Layout: the title block, then the text in a reading column with the contents beside it
  (above it, folded, on phones), then the conversation and the neighbouring posts.
*/
export const dynamicParams = false;

type Params = PageProps<'/[lang]/blog/[year]/[month]/[day]/[slug]'>;

// Every language and post at once: in this app, params from the [lang] layout are not used
// to expand a nested segment (a list built from them alone was ignored by the build).
export function generateStaticParams() {
  return locales.flatMap(lang => getPosts(lang).map(({ year, month, day, slug }) => ({ lang, year, month, day, slug })));
}

async function load(params: Params['params']) {
  const { lang, year, month, day, slug } = await params;
  if (!isLocale(lang)) return null;
  const post = getPost(lang, year, month, day, slug);
  return post ? { lang, post } : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const found = await load(params);
  if (!found) return {};
  const { lang, post } = found;
  return {
    title: `${post.title} — ${site.name}`,
    description: post.description,
    authors: [{ name: credits.name, url: credits.href }],
    keywords: post.tags,
    alternates: {
      canonical: localePath(lang, post.path),
      languages: Object.fromEntries(post.languages.map(l => [localeInfo[l].html, localePath(l, post.path)])),
    },
    openGraph: {
      type: 'article', title: post.title, description: post.description, url: localePath(lang, post.path),
      publishedTime: post.date.toISOString(), modifiedTime: post.updated?.toISOString(), authors: [credits.name], tags: post.tags,
    },
    robots: post.draft ? { index: false, follow: false } : undefined,
  };
}

export default async function PostPage({ params }: Params) {
  const found = await load(params);
  if (!found) notFound();
  const { lang, post } = found;
  const t = getDictionary(lang).blog;
  const { html, toc, minutes } = await renderPost(post);
  const posts = getPosts(lang);
  const index = posts.findIndex(p => p.id === post.id);
  const newer = posts[index - 1];
  const older = posts[index + 1];
  const others = post.languages.filter(l => l !== lang);
  const origin = siteOrigin();
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date.toISOString(),
    dateModified: (post.updated ?? post.date).toISOString(),
    inLanguage: localeInfo[lang].html,
    keywords: post.tags.join(', '),
    url: origin + localePath(lang, post.path),
    author: { '@type': 'Person', name: credits.name, url: credits.href },
    publisher: { '@type': 'Organization', name: site.name, logo: `${origin}/brand/logo.svg` },
  };
  const mail = `mailto:${site.contact.email}?subject=${encodeURIComponent(fill(t.reply.subject, { title: post.title }))}`;

  return <main id="conteudo" className="blog post">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <article className="shell post-grid" lang={localeInfo[lang].html}>
      <header className="post-head" id="post-topo">
        <a className="post-back" href={localePath(lang, '/blog')}><Arrow />{t.back}</a>
        <p className="label post-meta">
          <span className="point" aria-hidden="true" />
          <span>{t.kinds[post.kind]}</span>
          <time dateTime={isoDay(post.date)}>{longDate(lang, post.date)}</time>
          <span>{fill(t.minutes, { n: minutes })}</span>
          {post.draft && <span className="post-draft">{t.draft}</span>}
        </p>
        <h1 className="post-title">{post.title}</h1>
        <p className="post-lead">{post.description}</p>
        <div className="post-byline">
          <p>{t.by} <a href={credits.href} target="_blank" rel="noopener noreferrer">{credits.name}</a>
            {post.updated && <> · {fill(t.updated, { date: longDate(lang, post.updated) })}</>}</p>
          {others.length > 0 && <p className="post-languages">{t.alsoIn}{' '}
            {others.map(l => <a key={l} href={localePath(l, post.path)} hrefLang={localeInfo[l].html} lang={localeInfo[l].html}>{localeInfo[l].label}</a>)}
          </p>}
        </div>
        <TagList tags={post.tags} locale={lang} />
      </header>

      {toc.length > 1 && <aside className="post-toc" aria-labelledby="post-nesta-pagina">
        <details open>
          <summary id="post-nesta-pagina" className="label">{t.toc}</summary>
          <ol>{toc.map(item => <li key={item.id} data-depth={item.depth}><a href={`#${item.id}`}>{item.text}</a></li>)}</ol>
        </details>
        <a className="post-top" href="#post-topo">{t.top}</a>
      </aside>}

      <div className="post-text">
        {post.tldr && <section className="post-tldr" aria-label={t.tldr}>
          <p className="label">{t.tldr}</p>
          <p>{post.tldr}</p>
        </section>}
        <div className="post-body" dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      <footer className="post-foot">
        <section className="post-reply" aria-labelledby="post-conversa">
          <p id="post-conversa" className="label"><span className="point" aria-hidden="true" />{t.reply.label}</p>
          <p>{t.reply.text}</p>
          <a className="button button-primary" href={mail}>{t.reply.email}<Arrow /></a>
        </section>
        {(newer || older) && <nav className="post-neighbours" aria-label={t.all}>
          {older && <Neighbour post={older} label={t.older} lang={lang} />}
          {newer && <Neighbour post={newer} label={t.newer} lang={lang} />}
        </nav>}
      </footer>
    </article>
  </main>;
}

function Neighbour({ post, label, lang }: { post: { path: string; title: string }; label: string; lang: Locale }) {
  return <a className="post-neighbour" href={localePath(lang, post.path)}>
    <span className="label">{label}</span>
    <span className="post-neighbour-title">{post.title}</span>
  </a>;
}
