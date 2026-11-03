import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogIndex } from '@/components/blog/blog-index';
import { getDictionary, isLocale, localeInfo, localePath, locales } from '@/i18n';
import { getPosts } from '@/lib/blog/posts';

// Announcements: posts of the kind "anuncio" (new versions, launches), like a newsroom.
export async function generateMetadata({ params }: PageProps<'/[lang]/blog/anuncios'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang).blog;
  return {
    title: t.meta.announcements,
    description: t.announcements.intro,
    alternates: {
      canonical: localePath(lang, '/blog/anuncios'),
      languages: Object.fromEntries(locales.map(l => [localeInfo[l].html, localePath(l, '/blog/anuncios')])),
    },
  };
}

export default async function Announcements({ params }: PageProps<'/[lang]/blog/anuncios'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang).blog;
  const posts = getPosts(lang).filter(post => post.kind === 'anuncio');
  return <BlogIndex locale={lang} t={t} posts={posts} label={t.announcements.label} title={t.announcements.title} intro={t.announcements.intro} current="announcements" />;
}
