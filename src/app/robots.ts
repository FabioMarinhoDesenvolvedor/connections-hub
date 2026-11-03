import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/data/site';
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return { rules: { userAgent: '*', allow: '/' }, ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}) };
}
