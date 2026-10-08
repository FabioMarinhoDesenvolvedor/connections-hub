import type { MetadataRoute } from 'next';
import { site } from '@/data/site';
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || site.url).replace(/\/$/, '');
  return origin ? [{ url: origin, changeFrequency: 'monthly', priority: 1 }] : [];
}
