import { postKinds } from '@/lib/blog/posts';
import type { Draft, DraftImage } from './drafts';

/*
  From a draft to the Markdown file the blog reads (content/blog/AAAA/MM/DD-slug/index.md).
  The checks repeat the build's (lib/blog/posts.ts) so a draft that passes here also builds;
  the messages are in Portuguese, for the owner.
*/
export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TAG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const slugify = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').filter(Boolean).slice(0, 8).join('-');

export const tagList = (tags: string) => tags.split(',').map(t => slugify(t)).filter(Boolean);

const IMAGE_REF = /!\[[^\]]*\]\(([^)\s]+)/g;
export const referencedImages = (body: string) => [...body.matchAll(IMAGE_REF)].map(m => m[1]).filter(src => !/^[a-z]+:|^\//i.test(src));

export function problems(draft: Draft, images: DraftImage[]): string[] {
  const found: string[] = [];
  if (!draft.title.trim()) found.push('Falta o título.');
  if (!draft.description.trim()) found.push('Falta o resumo (aparece na lista, no Google e no RSS).');
  if (!SLUG.test(draft.slug)) found.push('O endereço precisa ter só letras minúsculas sem acento, números e hífens.');
  if (!(postKinds as readonly string[]).includes(draft.kind)) found.push('Escolha o tipo do post.');
  const tags = tagList(draft.tags);
  if (tags.length === 0 || tags.some(t => !TAG.test(t))) found.push('Coloque pelo menos um tema.');
  if (draft.body.trim().length < 20) found.push('O texto está vazio.');
  const names = new Set(images.map(i => i.name));
  for (const src of referencedImages(draft.body)) if (!names.has(src)) found.push(`A imagem "${src}" não foi enviada para este post.`);
  return found;
}

/** Today in Brasília: the day that names the post's folder. */
export function brasiliaNow(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now).map(p => [p.type, p.value]));
  return { year: parts.year, month: parts.month, day: parts.day };
}

const yaml = (text: string) => JSON.stringify(text.replace(/\s+/g, ' ').trim()); // a JSON string is valid YAML

export function indexMd(draft: Draft, dateIso: string): string {
  const lines = [
    '---',
    `title: ${yaml(draft.title)}`,
    `description: ${yaml(draft.description)}`,
    `date: "${dateIso}"`,
    `kind: ${draft.kind}`,
    `tags: [${tagList(draft.tags).join(', ')}]`,
    ...(draft.tldr.trim() ? [`tldr: ${yaml(draft.tldr)}`] : []),
    'draft: false',
    '---',
    '',
  ];
  return `${lines.join('\n')}${draft.body.replace(/\r\n?/g, '\n').trim()}\n`;
}
