import type { Dictionary, Locale } from '@/i18n';
import { localePath } from '@/i18n/config';
import { getPosts, getTags, type Post } from '@/lib/blog/posts';
import { PostList } from './post-list';

type Current = 'all' | 'announcements' | { tag: string };

/*
  The blog's listings (all posts, announcements, one topic) share one page: the title, the
  posts by month and, beside them, the ways in: announcements, every topic and the RSS feed.
  Server-rendered HTML only.
*/
export function BlogIndex({ locale, t, posts, label, title, intro, current }: {
  locale: Locale; t: Dictionary['blog']; posts: Post[]; label: string; title: string[]; intro?: string; current: Current;
}) {
  const tags = getTags(locale);
  const originals = locale === 'pt' ? 0 : getPosts('pt').length;
  const isTag = (tag: string) => typeof current === 'object' && current.tag === tag;
  return <main id="conteudo" className="blog">
    <div className="shell blog-grid">
      <header className="blog-head">
        <p className="label"><span className="point" aria-hidden="true" />{label}</p>
        <h1 className="blog-title">{title.map(line => <span className="line" key={line}>{line}</span>)}</h1>
        {intro && <p className="blog-intro">{intro}</p>}
      </header>
      <div className="blog-list">
        {posts.length > 0
          ? <PostList posts={posts} locale={locale} t={t} />
          : <div className="blog-empty">
            <p>{originals > 0 ? t.emptyLanguage : t.empty}</p>
            {originals > 0 && <a className="text-link" href="/blog" hrefLang="pt-BR">{t.readOriginal}</a>}
          </div>}
      </div>
      <aside className="blog-aside" aria-label={t.tags}>
        <nav className="blog-ways">
          <a href={localePath(locale, '/blog')} aria-current={current === 'all' ? 'page' : undefined}>{t.all}</a>
          <a href={localePath(locale, '/blog/anuncios')} aria-current={current === 'announcements' ? 'page' : undefined}>{t.announcements.label}</a>
          <a href={localePath(locale, '/blog/rss.xml')} type="application/rss+xml">{t.rss}</a>
        </nav>
        {tags.length > 0 && <>
          <h2 className="label blog-aside-title">{t.tags}</h2>
          <ul className="post-tags blog-all-tags">
            {tags.map(({ tag, count }) => <li key={tag}>
              <a href={localePath(locale, `/blog/tags/${tag}`)} aria-current={isTag(tag) ? 'page' : undefined}>#{tag} <span>{count}</span></a>
            </li>)}
          </ul>
        </>}
      </aside>
    </div>
  </main>;
}
