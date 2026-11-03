/*
  Rules the editor shares between the browser and the server, so both always agree: the
  address (slug) rule, the field sizes and the upload size. No server-only imports here.
*/
export const postKinds = ['artigo', 'opiniao', 'analise', 'projeto', 'anuncio'] as const;
export type PostKind = (typeof postKinds)[number];

export const FIELD_LIMITS = { title: 140, slug: 80, description: 300, kind: 20, tags: 200, tldr: 600, body: 200_000 } as const;
export const MAX_UPLOAD = 4 * 1024 * 1024; // Vercel functions accept bodies up to 4.5 MB
export const MAX_JSON = 1024 * 1024; // the longest body, UTF-8 and JSON-escaped, fits
export const MAX_IMAGES = 40;

export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const slugify = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').filter(Boolean).slice(0, 8).join('-');
