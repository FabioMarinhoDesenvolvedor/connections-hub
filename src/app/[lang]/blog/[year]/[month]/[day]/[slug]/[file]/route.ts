import fs from 'node:fs/promises';
import path from 'node:path';
import { isLocale, locales } from '@/i18n';
import { getImages, getPost, getPosts, IMAGE_TYPES } from '@/lib/blog/posts';

/*
  A post's images live in its own folder (content/blog/2026/11/03-slug/foto.webp) and are
  served next to it (/blog/2026/11/03/slug/foto.webp), written out at build time. Only image
  types, only files that exist in that folder: no SVG (it could carry script).
*/
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.flatMap(lang => getPosts(lang).flatMap(post => getImages(post).map(file => ({
    lang, year: post.year, month: post.month, day: post.day, slug: post.slug, file,
  }))));
}

export async function GET(_request: Request, { params }: RouteContext<'/[lang]/blog/[year]/[month]/[day]/[slug]/[file]'>) {
  const { lang, year, month, day, slug, file } = await params;
  const post = isLocale(lang) ? getPost(lang, year, month, day, slug) : undefined;
  if (!post || !getImages(post).includes(file)) return new Response('Not found', { status: 404 });
  const data = await fs.readFile(path.join(post.dir, file));
  return new Response(new Uint8Array(data), {
    headers: { 'Content-Type': IMAGE_TYPES[path.extname(file).toLowerCase()], 'Cache-Control': 'public, max-age=86400' },
  });
}
