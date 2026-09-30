import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  return origin ? [{ url: origin, changeFrequency: 'monthly', priority: 1 }] : [];
}
