import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogIndex } from '@/components/blog/blog-index';
import { getDictionary, isLocale, localeInfo, localePath, locales } from '@/i18n';
import { getPosts } from '@/lib/blog/posts';

export async function generateMetadata({ params }: PageProps<'/[lang]/blog'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang).blog;
  return {
    title: t.meta.title,
    description: t.meta.description,
    alternates: {
      canonical: localePath(lang, '/blog'),
      languages: Object.fromEntries(locales.map(l => [localeInfo[l].html, localePath(l, '/blog')])),
      types: { 'application/rss+xml': localePath(lang, '/blog/rss.xml') },
    },
    openGraph: { title: t.meta.title, description: t.meta.description, url: localePath(lang, '/blog') },
  };
}

export default async function Blog({ params }: PageProps<'/[lang]/blog'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang).blog;
  return <BlogIndex locale={lang} t={t} posts={getPosts(lang)} label={t.label} title={t.title} current="all" />;
}
