import type { MetadataRoute } from 'next';
import { site } from '@/data/site';
import { localeInfo, locales } from '@/i18n/config';

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || site.url).replace(/\/$/, '');
  const url = (path: string) => origin + (path === '/' ? '' : path);
  const languages = Object.fromEntries(locales.map(l => [localeInfo[l].html, url(localeInfo[l].path)]));
  return locales.map(l => ({ url: url(localeInfo[l].path), changeFrequency: 'monthly', priority: l === 'pt' ? 1 : 0.8, alternates: { languages } }));
}
