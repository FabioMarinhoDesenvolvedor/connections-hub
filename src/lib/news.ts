import type { Locale } from '@/i18n';
import { localePath } from '@/i18n/config';
import { getPosts } from '@/lib/blog/posts';

/*
  Launch news comes from the blog itself: the newest published post of kind "anuncio"
  (the newsroom at /blog/anuncios). Publishing an announcement in the editor updates the
  hero pill and the menu's "new" dot with the next build. Nothing is stored in the browser.
*/
export type LatestNews = { title: string; href: string; date: string };

export function latestNews(locale: Locale): LatestNews | null {
  const post = getPosts(locale).find(p => p.kind === 'anuncio' && !p.draft);
  return post ? { title: post.title, href: localePath(locale, post.path), date: post.date.toISOString() } : null;
}

export const newsIndex = (locale: Locale) => localePath(locale, '/blog/anuncios');
/** How long the menu marks the newest announcement as recent. */
export const NEWS_FRESH_DAYS = 14;
