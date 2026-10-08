import type { MetadataRoute } from 'next';
import { site } from '@/data/site';
export default function robots(): MetadataRoute.Robots {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || site.url;
  return { rules: { userAgent: '*', allow: '/' }, ...(origin ? { sitemap: `${origin.replace(/\/$/, '')}/sitemap.xml` } : {}) };
}
