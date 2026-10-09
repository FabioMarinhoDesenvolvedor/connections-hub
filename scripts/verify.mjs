import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const origin = process.env.VERIFY_URL || 'http://127.0.0.1:3001';
const page = await fetch(origin);
assert.equal(page.status, 200, 'Homepage must return 200');
const html = await page.text();
assert.match(html, /lang="pt-BR"/, 'Portuguese document language');
assert.equal((html.match(/<h1\b/g) || []).length, 1, 'Exactly one h1');
assert.match(html, /name="description"/, 'Description metadata');
assert.match(html, /property="og:image"/, 'Social sharing image');
assert.match(html, /rel="canonical"/, 'Canonical for the supplied production domain');
for (const label of ['Aplicação da identidade', 'Conhecimento como pilar central', 'Personalizadas de acordo', 'Nenhuma trajetória']) assert.ok(!html.includes(label), `Internal or redundant copy must not be published: ${label}`);
for (const text of ['Tudo começa com uma conexão.', 'A semente de uma ideia.', 'Tem um projeto, uma ideia ou um problema para resolver?']) assert.ok(html.includes(text), `Brand copy rendered as HTML: ${text}`);
for (const step of ['Entendemos', 'Planejamos', 'Desenvolvemos', 'Implementamos']) assert.ok(html.includes(step), `Preserved process: ${step}`);
assert.ok(!html.includes('O que construímos.'), 'Do not expose an empty project gallery');
for (const id of ['inicio', 'conceito', 'sobre', 'solucoes', 'solucao-sites', 'solucao-sistemas', 'solucao-dashboards', 'solucao-ecommerce', 'processo', 'manifesto', 'contato']) assert.ok(html.includes(`id="${id}"`), `Anchor ${id}`);
for (const link of ['https://wa.me/5511974589226', 'mailto:contato@connectionshub.com.br', 'tel:+5511974589226']) assert.ok(html.includes(link), `Official channel ${link}`);
for (const asset of ['/brand/logo.svg', '/brand/logo-light.svg', '/brand/signature-sand.svg', '/brand/ring-orange.svg', '/images/brand-office.avif', '/images/brand-office-small.avif', '/images/brand-office.webp', '/images/brand-people.avif', '/images/brand-people-small.avif', '/images/brand-technology.avif', '/images/brand-technology-small.avif', '/fonts/Satoshi-Variable.woff2', '/favicon.png', '/robots.txt', '/sitemap.xml']) assert.equal((await fetch(origin + asset)).status, 200, asset);
const originals = path.resolve('Referências/CONNECTIONS HUB ID VISUAL/SVG');
const files = await fs.readdir(originals);
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const originalHashes = new Set(await Promise.all(files.map(async file => hash(await fs.readFile(path.join(originals, file))))));
for (const file of await fs.readdir('public/brand')) assert.ok(originalHashes.has(hash(await fs.readFile(path.join('public/brand', file)))), `${file} must be an unchanged official SVG`);
assert.equal(hash(await fs.readFile('public/fonts/Satoshi-Variable.woff2')), hash(await fs.readFile('Referências/FONTE_ Satoshi_Complete/Fonts/WEB/fonts/Satoshi-Variable.woff2')), 'Official Satoshi must be intact');
const mainJS = [...html.matchAll(/<script src="([^"]+)"/g)].map(match => match[1]);
let transferred = 0;
for (const src of mainJS) {
  const script = await (await fetch(origin + src)).text();
  transferred += Buffer.byteLength(script);
  assert.ok(!script.includes('THREE.WebGLRenderer'), 'three.js and the story renderer must load on demand, never in an initial script');
}

// Languages: Portuguese at the root (/pt redirects there), English and Japanese under their prefixes,
// each a complete page with the same anchors and no Portuguese copy left in it.
assert.equal((await fetch(origin + '/pt', { redirect: 'manual' })).status, 308, '/pt redirects to the root');
assert.equal((await fetch(origin + '/de')).status, 404, 'Unknown languages are not served');
for (const lang of ['pt-BR', 'en', 'ja']) assert.match(html, new RegExp(`hrefLang="${lang}"`), `hreflang ${lang}`);
const translated = { en: ['lang="en"', 'Connecting ideas.', 'The seed of an idea.', 'Everything starts with a connection.'], ja: ['lang="ja"', 'アイデアをつなぐ。', 'ひとつのアイデアの種。', 'すべては、ひとつのつながりから始まる。'] };
for (const [path, expected] of Object.entries(translated)) {
  const response = await fetch(`${origin}/${path}`);
  assert.equal(response.status, 200, `/${path}`);
  const page = await response.text();
  for (const text of expected) assert.ok(page.includes(text), `/${path} renders ${text}`);
  const copy = page.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  for (const portuguese of ['Fale conosco', 'Soluções', 'Você recebe', 'Tudo começa com uma conexão.']) assert.ok(!copy.includes(portuguese), `/${path} has no Portuguese copy: ${portuguese}`);
  for (const id of ['inicio', 'sobre', 'solucoes', 'processo', 'manifesto', 'contato']) assert.ok(page.includes(`id="${id}"`), `/${path} anchor ${id}`);
}

// Theme: chosen before first paint, and the hand-off has the official file for each theme.
assert.match(html, /localStorage\.getItem\('theme'\)/, 'Theme is applied by an inline script before paint');
assert.ok(html.includes('class="for-dark" src="/brand/logo-light.svg"'), 'Dark theme lands on the official light logo');

console.log(`Verified: metadata, headings, anchors, official contacts, asset HTTP responses, byte-for-byte SVG/font integrity, PT/EN/JA routes and copy, theme boot. Initial script source: ${Math.round(transferred / 1024)} KiB uncompressed.`);
