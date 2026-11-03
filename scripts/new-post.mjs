import fs from 'node:fs/promises';
import path from 'node:path';

/*
  Starts a post: npm run post:new "Título do post" [-- --kind analise --tags rust,seguranca]

  Creates content/blog/AAAA/MM/DD-slug/index.md for today (Brasília time) with the front
  matter filled in and draft: true, so it only shows in `npm run dev` until it is ready.
*/
const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const kind = option('kind') ?? 'artigo';
const tags = (option('tags') ?? 'rascunho').split(',').map(tag => tag.trim()).filter(Boolean);
const title = args.join(' ').trim();
const kinds = ['artigo', 'opiniao', 'analise', 'projeto', 'anuncio'];

if (!title) {
  console.error('Usage: npm run post:new "Título do post" [-- --kind analise --tags rust,seguranca]');
  process.exit(1);
}
if (!kinds.includes(kind)) {
  console.error(`--kind must be one of: ${kinds.join(', ')}`);
  process.exit(1);
}

const slug = title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 8).join('-');
const now = new Date();
const part = type => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', [type]: type === 'year' ? 'numeric' : '2-digit', hourCycle: 'h23' })
  .formatToParts(now).find(p => p.type === type).value;
const [year, month, day, hour, minute] = ['year', 'month', 'day', 'hour', 'minute'].map(part);
const dir = path.join('content', 'blog', year, month, `${day}-${slug}`);

try {
  await fs.access(dir);
  console.error(`${dir} already exists.`);
  process.exit(1);
} catch {}

await fs.mkdir(dir, { recursive: true });
await fs.writeFile(path.join(dir, 'index.md'), `---
title: ${JSON.stringify(title)}
description: "Uma ou duas frases dizendo do que o post trata. Aparece na lista, no Google e no RSS."
date: "${year}-${month}-${day}T${hour}:${minute}:00-03:00"
kind: ${kind}
tags: [${tags.join(', ')}]
# tldr: "O resumo em destaque no topo do post (opcional)."
draft: true
---

Escreva aqui. Use ## para as seções; elas viram o índice "Nesta página".
`);

console.log(`Created ${path.join(dir, 'index.md')}
Next:
  1. npm run dev and open http://127.0.0.1:3000/blog/${year}/${month}/${day}/${slug}
  2. Write. Images go in the same folder, referenced by file name.
  3. Ask for a review following content/blog/GUIA.md.
  4. Set draft: false, open a PR on a post/${slug} branch, read it in the Vercel preview, merge.`);
