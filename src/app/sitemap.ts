import type { MetadataRoute } from 'next';
import { site } from '@/data/site';
import { localeInfo, localePath, locales } from '@/i18n/config';
import { getPosts } from '@/lib/blog/posts';

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || site.url).replace(/\/$/, '');
  const url = (path: string) => origin + (path === '/' ? '' : path);
  const languages = Object.fromEntries(locales.map(l => [localeInfo[l].html, url(localeInfo[l].path)]));
  const home: MetadataRoute.Sitemap = locales.map(l => ({ url: url(localeInfo[l].path), changeFrequency: 'monthly', priority: l === 'pt' ? 1 : 0.8, alternates: { languages } }));
  const blogLanguages = Object.fromEntries(locales.map(l => [localeInfo[l].html, url(localePath(l, '/blog'))]));
  const blog: MetadataRoute.Sitemap = locales.map(l => ({ url: url(localePath(l, '/blog')), changeFrequency: 'weekly', priority: 0.7, alternates: { languages: blogLanguages } }));
  // Drafts never go in the sitemap, even in a build that shows them for review.
  const posts: MetadataRoute.Sitemap = locales.flatMap(l => getPosts(l).filter(post => !post.draft).map(post => ({
    url: url(localePath(l, post.path)),
    lastModified: post.updated ?? post.date,
    priority: 0.6,
    alternates: { languages: Object.fromEntries(post.languages.map(other => [localeInfo[other].html, url(localePath(other, post.path))])) },
  })));
  return [...home, ...blog, ...posts];
}
