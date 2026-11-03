import { Arrow } from '@/components/arrow';
import { PostRow } from '@/components/blog/post-list';
import { SectionHead } from '@/components/section-head';
import type { Dictionary, Locale } from '@/i18n';
import { localePath } from '@/i18n/config';
import { getPosts } from '@/lib/blog/posts';

const LATEST = 3;

// The three newest posts, announcements included, just before the closing. Absent while
// nothing is published in this language.
export function BlogLatest({ t, locale }: { t: Dictionary['blog']; locale: Locale }) {
  const posts = getPosts(locale).filter(post => !post.draft).slice(0, LATEST);
  if (posts.length === 0) return null;
  return <section id="blog" className="blog-latest" aria-labelledby="blog-title">
    <div className="shell">
      <SectionHead label={t.latest.label} id="blog-title" lines={t.latest.title} />
      <ol className="post-items blog-latest-items">
        {posts.map(post => <li key={post.id} data-reveal><PostRow post={post} locale={locale} t={t} /></li>)}
      </ol>
      <a className="text-link blog-latest-all" href={localePath(locale, '/blog')}>{t.latest.all}<Arrow /></a>
    </div>
  </section>;
}
