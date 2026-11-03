import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogIndex } from '@/components/blog/blog-index';
import { fill } from '@/components/blog/format';
import { getDictionary, isLocale, localePath, locales } from '@/i18n';
import { getPosts, getTags } from '@/lib/blog/posts';

export const dynamicParams = false;

// Every language and topic at once (see the note in the post page).
export function generateStaticParams() {
  return locales.flatMap(lang => getTags(lang).map(({ tag }) => ({ lang, tag })));
}

export async function generateMetadata({ params }: PageProps<'/[lang]/blog/tags/[tag]'>): Promise<Metadata> {
  const { lang, tag } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang).blog;
  return { title: fill(t.meta.tag, { tag: `#${tag}` }), alternates: { canonical: localePath(lang, `/blog/tags/${tag}`) } };
}

export default async function Tag({ params }: PageProps<'/[lang]/blog/tags/[tag]'>) {
  const { lang, tag } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang).blog;
  const posts = getPosts(lang).filter(post => post.tags.includes(tag));
  if (posts.length === 0) notFound();
  return <BlogIndex locale={lang} t={t} posts={posts} label={t.tags} title={[fill(t.tagTitle, { tag: `#${tag}` })]} current={{ tag }} />;
}
