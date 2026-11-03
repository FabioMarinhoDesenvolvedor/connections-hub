import fs from 'node:fs';
import path from 'node:path';
import type { Element, ElementContent, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { localePath } from '@/i18n/config';
import { FENCE_LANGUAGES, highlight } from '@/lib/highlight';
import { IMAGE_TYPES, type Post } from './posts';

/*
  Markdown to HTML, once, at build time. The page receives finished HTML and no script.

  remark-parse → remark-gfm (tables, footnotes, task lists) → remark-rehype → sanitize (posts
  are ours, but nothing raw gets through anyway) → slugs on headings → the steps below:
  - "# " inside a post becomes "## ": the page already has the title as its only h1;
  - code fences use the site's own highlighter (lib/highlight.ts), in brand colours;
  - images by file name resolve to the post's folder and get their real size (no layout shift);
    a missing one stops the build;
  - a heading that would take one of the page's own ids gets a suffix;
  - links that leave the site open in a new tab;
  - h2/h3 become the "On this page" list.
*/

export type TocItem = { id: string; text: string; depth: 2 | 3 };
export type Rendered = { html: string; toc: TocItem[]; minutes: number };

const WORDS_PER_MINUTE = 220;
const FOOTNOTES: Record<Post['locale'], { label: string; back: string }> = {
  pt: { label: 'Notas', back: 'Voltar ao texto' },
  en: { label: 'Notes', back: 'Back to the text' },
  ja: { label: '注', back: '本文に戻る' },
};
const JA_CHARS_PER_MINUTE = 500;

// Ids the post page uses for itself; a heading with the same text gets a suffix instead.
const RESERVED_IDS = new Set(['conteudo', 'post-topo', 'post-conversa', 'post-nesta-pagina']);

const el = (tagName: string, className: string, children: ElementContent[]): Element =>
  ({ type: 'element', tagName, properties: { className: [className] }, children });

async function size(file: string): Promise<{ width: number; height: number } | null> {
  try {
    const sharp = (await import('sharp')).default;
    const { width, height } = await sharp(file).metadata();
    return width && height ? { width, height } : null;
  } catch {
    return null;
  }
}

function postSteps(post: Post, toc: TocItem[], images: Map<string, { width: number; height: number } | null>) {
  return () => (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'h1') node.tagName = 'h2';
      if (/^h[2-6]$/.test(node.tagName) && typeof node.properties.id === 'string' && RESERVED_IDS.has(node.properties.id)) node.properties.id += '-1';
      if ((node.tagName === 'h2' || node.tagName === 'h3') && typeof node.properties.id === 'string' && node.properties.id !== 'footnote-label') {
        toc.push({ id: node.properties.id, text: toString(node), depth: node.tagName === 'h2' ? 2 : 3 });
      }
      if (node.tagName === 'pre') {
        const code = node.children.find((c): c is Element => c.type === 'element' && c.tagName === 'code');
        if (!code) return;
        const classes = (code.properties.className as string[] | undefined) ?? [];
        const fence = classes.find(c => c.startsWith('language-'))?.slice('language-'.length);
        const language = fence ? FENCE_LANGUAGES[fence.toLowerCase()] : undefined;
        node.properties.className = ['post-code'];
        if (fence) node.properties.dataLanguage = fence;
        if (!language) return;
        const source = toString(code).replace(/\n$/, '');
        code.children = highlight(source, language).flatMap((tokens, i) => [
          ...(i ? [{ type: 'text', value: '\n' } as const] : []),
          ...tokens.map(t => el('span', `tk-${t.kind}`, [{ type: 'text', value: t.text }])),
        ]);
      }
      if (node.tagName === 'img' && typeof node.properties.src === 'string') {
        const src = node.properties.src;
        if (!/^[a-z]+:|^\//i.test(src)) {
          const name = path.basename(src);
          // Served next to this language's page, so a translation never depends on another one.
          node.properties.src = `${localePath(post.locale, post.path)}/${name}`;
          const dims = images.get(name);
          if (dims) Object.assign(node.properties, dims);
        }
        node.properties.loading = 'lazy';
        node.properties.decoding = 'async';
      }
      if (node.tagName === 'a' && typeof node.properties.href === 'string' && /^https?:/.test(node.properties.href)) {
        node.properties.target = '_blank';
        node.properties.rel = ['noopener', 'noreferrer'];
      }
    });
  };
}

export async function renderPost(post: Post): Promise<Rendered> {
  // Sizes of the images the post refers to by file name, read before the synchronous pass.
  const images = new Map<string, { width: number; height: number } | null>();
  for (const [, src] of post.body.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) {
    const name = path.basename(src);
    if (/^[a-z]+:|^\//i.test(src) || !(path.extname(name).toLowerCase() in IMAGE_TYPES)) continue;
    const file = path.join(post.dir, name);
    if (!fs.existsSync(file)) throw new Error(`Blog: ${path.relative(process.cwd(), post.dir)}: the image "${name}" is not in the post's folder`);
    images.set(name, await size(file));
  }
  const toc: TocItem[] = [];
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { footnoteLabel: FOOTNOTES[post.locale].label, footnoteBackLabel: FOOTNOTES[post.locale].back })
    // remark-rehype already prefixes footnote ids; a second prefix would break their links.
    .use(rehypeSanitize, { ...defaultSchema, clobberPrefix: '' })
    .use(rehypeSlug)
    .use(postSteps(post, toc, images))
    .use(rehypeStringify)
    .process(post.body);
  const words = post.locale === 'ja' ? post.body.replace(/\s/g, '').length / JA_CHARS_PER_MINUTE : post.body.split(/\s+/).filter(Boolean).length / WORDS_PER_MINUTE;
  return { html: String(file), toc, minutes: Math.max(1, Math.round(words)) };
}
