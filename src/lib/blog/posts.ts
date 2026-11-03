import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { Locale } from '@/i18n/config';

/*
  The blog's posts, read from content/blog at build time (never in the browser).

  One folder per post, named by its publication day: content/blog/2026/11/03-slug/
    index.md       Portuguese, the original
    index.en.md    optional English version
    index.ja.md    optional Japanese version
    *.webp, *.png  images, referenced by file name from the Markdown

  The folder gives the address (/blog/2026/11/03/slug), the front matter everything else.
  A post with a missing or wrong field stops the build with a message saying which file
  and which field, so a broken post never reaches the site. Drafts only show in
  `npm run dev`, or in a build with BLOG_DRAFTS=1 (for reviewing them in a preview).
*/

export const postKinds = ['artigo', 'opiniao', 'analise', 'projeto', 'anuncio'] as const;
export type PostKind = (typeof postKinds)[number];

export type Post = {
  locale: Locale;
  /** The folder, relative to content/blog: "2026/11/03-slug". Shared by every translation. */
  id: string;
  year: string;
  month: string;
  day: string;
  slug: string;
  /** /blog/2026/11/03/slug, without the language prefix. */
  path: string;
  title: string;
  description: string;
  date: Date;
  updated?: Date;
  kind: PostKind;
  tags: string[];
  tldr?: string;
  draft: boolean;
  /** Languages this post exists in, the original first. */
  languages: Locale[];
  body: string;
  /** Absolute folder on disk, for its images. */
  dir: string;
};

const ROOT = path.join(process.cwd(), 'content', 'blog');
const FOLDER = /^(\d{4})\/(\d{2})\/(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const FILES: Record<Locale, string> = { pt: 'index.md', en: 'index.en.md', ja: 'index.ja.md' };
export const IMAGE_TYPES: Record<string, string> = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.avif': 'image/avif', '.gif': 'image/gif' };

export const showDrafts = () => process.env.NODE_ENV === 'development' || process.env.BLOG_DRAFTS === '1';

function fail(file: string, problem: string): never {
  throw new Error(`Blog: ${path.relative(process.cwd(), file)}: ${problem}`);
}

/*
  A day without a time ("2026-11-03", quoted or not) means that day in Brasília. JavaScript
  and YAML read it as midnight UTC, which is still the previous evening in Brasília, so it is
  pinned to noon there instead.
*/
const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;
function toDate(value: unknown, file: string, field: string): Date {
  const dayOnly = value instanceof Date && value.getUTCHours() === 0 && value.getUTCMinutes() === 0 && value.getUTCSeconds() === 0 && value.getUTCMilliseconds() === 0
    ? value.toISOString().slice(0, 10)
    : typeof value === 'string' && DAY_ONLY.test(value.trim()) ? value.trim() : null;
  const date = dayOnly ? new Date(`${dayOnly}T12:00:00-03:00`) : value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) fail(file, `"${field}" must be a date such as 2026-11-03 or "2026-11-03T10:00:00-03:00"`);
  return date;
}

function text(value: unknown, file: string, field: string, required = true): string | undefined {
  if (value === undefined || value === null || value === '') {
    if (required) fail(file, `"${field}" is missing`);
    return undefined;
  }
  if (typeof value !== 'string') fail(file, `"${field}" must be text`);
  return value.trim();
}

/** Every post folder, sorted, found by walking year/month folders. */
function folders(): string[] {
  if (!fs.existsSync(ROOT)) return [];
  const found: string[] = [];
  for (const year of fs.readdirSync(ROOT)) {
    const yearDir = path.join(ROOT, year);
    if (!/^\d{4}$/.test(year) || !fs.statSync(yearDir).isDirectory()) continue;
    for (const month of fs.readdirSync(yearDir)) {
      const monthDir = path.join(yearDir, month);
      if (!fs.statSync(monthDir).isDirectory()) continue;
      for (const post of fs.readdirSync(monthDir)) {
        if (fs.statSync(path.join(monthDir, post)).isDirectory()) found.push(`${year}/${month}/${post}`);
      }
    }
  }
  return found.sort();
}

/** A translation counts only if it exists and would be shown (a draft is not, in production). */
function published(file: string): boolean {
  if (!fs.existsSync(file)) return false;
  return showDrafts() || matter(fs.readFileSync(file, 'utf8')).data.draft !== true;
}

function read(id: string, locale: Locale): Post | null {
  const dir = path.join(ROOT, id);
  const file = path.join(dir, FILES[locale]);
  if (!fs.existsSync(file)) return null;
  const match = FOLDER.exec(id);
  if (!match) fail(dir, 'folder must be AAAA/MM/DD-slug, in lowercase letters, digits and hyphens');
  const [, year, month, day, slug] = match;
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  const kind = text(data.kind, file, 'kind') as PostKind;
  if (!postKinds.includes(kind)) fail(file, `"kind" must be one of ${postKinds.join(', ')}`);
  if (!Array.isArray(data.tags) || data.tags.length === 0 || data.tags.some(tag => typeof tag !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(tag))) {
    fail(file, '"tags" must be a list such as [rust, seguranca], in lowercase letters, digits and hyphens');
  }
  const date = toDate(data.date, file, 'date');
  // The folder and the date must agree, so the address never contradicts the post.
  const day0 = date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  if (day0 !== `${year}-${month}-${day}`) fail(file, `"date" (${day0} in Brasília) does not match the folder ${year}/${month}/${day}`);
  if (data.draft !== undefined && typeof data.draft !== 'boolean') fail(file, '"draft" must be true or false');
  return {
    locale, id, year, month, day, slug,
    path: `/blog/${year}/${month}/${day}/${slug}`,
    title: text(data.title, file, 'title')!,
    description: text(data.description, file, 'description')!,
    date,
    updated: data.updated ? toDate(data.updated, file, 'updated') : undefined,
    kind,
    tags: data.tags as string[],
    tldr: text(data.tldr, file, 'tldr', false),
    draft: data.draft === true,
    languages: (Object.keys(FILES) as Locale[]).filter(l => published(path.join(dir, FILES[l]))),
    body: content,
    dir,
  };
}

// A build reads each file once; `npm run dev` rereads so edits show on the next refresh.
const cache = new Map<Locale, Post[]>();

/** Published posts in one language, newest first. */
export function getPosts(locale: Locale): Post[] {
  const cached = process.env.NODE_ENV === 'production' ? cache.get(locale) : undefined;
  if (cached) return cached;
  const drafts = showDrafts();
  const posts = folders()
    .map(id => {
      if (!fs.existsSync(path.join(ROOT, id, FILES.pt))) fail(path.join(ROOT, id), 'every post needs index.md, the Portuguese original');
      return read(id, locale);
    })
    .filter((post): post is Post => post !== null && (drafts || !post.draft))
    .sort((a, b) => b.date.getTime() - a.date.getTime() || a.title.localeCompare(b.title));
  cache.set(locale, posts);
  return posts;
}

export function getPost(locale: Locale, year: string, month: string, day: string, slug: string): Post | undefined {
  return getPosts(locale).find(p => p.year === year && p.month === month && p.day === day && p.slug === slug);
}

/** Tags in use in one language, the most used first. */
export function getTags(locale: Locale): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of getPosts(locale)) for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Images in a post's folder, served next to it (see the [file] route). */
export function getImages(post: Post): string[] {
  return fs.readdirSync(post.dir).filter(file => path.extname(file).toLowerCase() in IMAGE_TYPES);
}
