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
for (const id of ['inicio', 'conceito', 'sobre', 'solucoes', 'processo', 'manifesto', 'contato']) assert.ok(html.includes(`id="${id}"`), `Anchor ${id}`);
for (const link of ['https://wa.me/5511974589226', 'mailto:contato.connectionstree@gmail.com', 'tel:+5511974589226']) assert.ok(html.includes(link), `Official channel ${link}`);
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
  assert.ok(!script.includes('class WebGLRenderer'), 'Three.js cannot be included in an initial script');
}
console.log(`Verified: metadata, headings, anchors, official contacts, asset HTTP responses and byte-for-byte SVG/font integrity. Initial script source: ${Math.round(transferred / 1024)} KiB uncompressed.`);
