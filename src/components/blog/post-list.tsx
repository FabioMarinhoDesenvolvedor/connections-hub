import type { Dictionary, Locale } from '@/i18n';
import { localePath } from '@/i18n/config';
import type { Post } from '@/lib/blog/posts';
import { count, isoDay, monthOf, shortDate } from './format';

/*
  Posts grouped by month, newest first, the way a working notebook reads: the month and how
  many posts it holds, then one line per post with its day, kind, title, summary and topics.
*/
export function PostList({ posts, locale, t }: { posts: Post[]; locale: Locale; t: Dictionary['blog'] }) {
  const months = new Map<string, Post[]>();
  for (const post of posts) {
    const key = `${post.year}-${post.month}`;
    months.set(key, [...(months.get(key) ?? []), post]);
  }
  return <div className="post-months">
    {[...months].map(([key, items]) => <section key={key} className="post-month" aria-labelledby={`mes-${key}`}>
      <header className="post-month-head">
        <h2 id={`mes-${key}`} className="label">{monthOf(locale, items[0].date)}</h2>
        <span>{count(t.count, items.length)}</span>
      </header>
      <ol className="post-items">
        {items.map(post => <li key={post.id}>
          <PostRow post={post} locale={locale} t={t} />
        </li>)}
      </ol>
    </section>)}
  </div>;
}

export function PostRow({ post, locale, t, heading: Heading = 'h3' }: { post: Post; locale: Locale; t: Dictionary['blog']; heading?: 'h2' | 'h3' }) {
  return <article className="post-row">
    <time className="post-row-date" dateTime={isoDay(post.date)}>{shortDate(locale, post.date)}</time>
    <div className="post-row-body">
      <p className="post-kind">
        {post.kind === 'anuncio' && <span className="point" aria-hidden="true" />}
        {t.kinds[post.kind]}
        {post.draft && <span className="post-draft">{t.draft}</span>}
      </p>
      <Heading className="post-row-title"><a href={localePath(locale, post.path)}>{post.title}</a></Heading>
      <p className="post-row-summary">{post.description}</p>
      <TagList tags={post.tags} locale={locale} />
    </div>
  </article>;
}

export function TagList({ tags, locale }: { tags: string[]; locale: Locale }) {
  return <ul className="post-tags">
    {tags.map(tag => <li key={tag}><a href={localePath(locale, `/blog/tags/${tag}`)}>#{tag}</a></li>)}
  </ul>;
}
