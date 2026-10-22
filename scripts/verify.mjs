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
for (const label of ['Aplicação da identidade', 'Conhecimento como pilar central', 'Personalizadas de acordo', 'Nenhuma trajetória', 'Tudo começa com uma conexão', 'Somos feitos de conexões', 'A semente de uma ideia', 'Pessoas. Ideias. Tecnologia.', 'Manifesto']) assert.ok(!html.includes(label), `Internal or redundant copy must not be published: ${label}`);
for (const text of ['Conectando ideias.', 'Construindo soluções.', 'Tem um projeto, uma ideia ou um problema para resolver?']) assert.ok(html.includes(text), `Copy rendered as HTML: ${text}`);
// Security: the section's claims are headers the site really sends.
for (const [name, expected] of [['strict-transport-security', 'max-age='], ['content-security-policy', "frame-ancestors 'none'"], ['content-security-policy', "default-src 'self'"], ['x-content-type-options', 'nosniff'], ['x-frame-options', 'DENY'], ['referrer-policy', 'strict-origin-when-cross-origin'], ['permissions-policy', 'camera=()']]) assert.ok((page.headers.get(name) || '').includes(expected), `Security header ${name}: ${expected}`);
assert.ok(html.includes('Segurança não é promessa.') && html.includes('frame-ancestors'), 'Security section rendered as HTML');
assert.ok(!html.includes('id="solucoes"'), 'The pinned services section is gone');
for (const step of ['Entendemos', 'Planejamos', 'Desenvolvemos', 'Implementamos']) assert.ok(html.includes(step), `Preserved process: ${step}`);
for (const text of ['Código em uso.', 'Marketing Dashboard', 'WorkHub', 'WSN Loja', 'Tasks', '/api/cards/{id}/enviar-ao-cliente', 'card_approved_snapshots', 'Ver em ação', 'dados fictícios']) assert.ok(html.includes(text), `Projects rendered as HTML: ${text}`);
for (const removed of ['Clozi', 'Cifra Pompeia', 'Tina Tur']) assert.ok(!html.includes(removed), `Project no longer shown: ${removed}`);
assert.ok(html.includes('href="https://github.com/FabioMarinhoDesenvolvedor"'), 'GitHub profile linked');
assert.ok(html.includes('class="code-term"') && html.includes('somarHorasUteis'), 'About shows the code terminal with real code');
for (const photo of ['brand-office', 'brand-people', 'brand-technology']) assert.ok(!html.includes(photo), `No office or team mockup published: ${photo}`);
for (const image of ['alcool-gel', 'detergente', 'luva-nitrilica', 'papel-toalha']) assert.equal((await fetch(`${origin}/projects/wsn/${image}.webp`)).status, 200, `WSN product image ${image}`);
for (const id of ['inicio', 'sobre', 'seguranca', 'projetos', 'projeto-marketing', 'processo', 'contato']) assert.ok(html.includes(`id="${id}"`), `Anchor ${id}`);
for (const link of ['https://wa.me/5511974589226', 'mailto:contato@connectionshub.com.br', 'tel:+5511974589226']) assert.ok(html.includes(link), `Official channel ${link}`);
for (const asset of ['/brand/logo.svg', '/brand/logo-light.svg', '/brand/signature-sand.svg', '/brand/ring-orange.svg', '/images/social.jpg', '/fonts/Satoshi-Variable.woff2', '/favicon.png', '/robots.txt', '/sitemap.xml']) assert.equal((await fetch(origin + asset)).status, 200, asset);
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
  assert.ok(!script.includes('THREE.WebGLRenderer') && !script.includes('WebGLRenderer'), 'No 3D renderer in an initial script');
}

// Languages: Portuguese at the root (/pt redirects there), English and Japanese under their prefixes,
// each a complete page with the same anchors and no Portuguese copy left in it.
assert.equal((await fetch(origin + '/pt', { redirect: 'manual' })).status, 308, '/pt redirects to the root');
assert.equal((await fetch(origin + '/de')).status, 404, 'Unknown languages are not served');
for (const lang of ['pt-BR', 'en', 'ja']) assert.match(html, new RegExp(`hrefLang="${lang}"`), `hreflang ${lang}`);
const translated = { en: ['lang="en"', 'Connecting ideas.', 'Building solutions.'], ja: ['lang="ja"', 'アイデアをつなぐ。', 'ソリューションを築く。'] };
for (const [path, expected] of Object.entries(translated)) {
  const response = await fetch(`${origin}/${path}`);
  assert.equal(response.status, 200, `/${path}`);
  const page = await response.text();
  for (const text of expected) assert.ok(page.includes(text), `/${path} renders ${text}`);
  const copy = page.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  for (const portuguese of ['Fale conosco', 'Segurança não é promessa.', 'Você recebe', 'Construindo soluções.']) assert.ok(!copy.includes(portuguese), `/${path} has no Portuguese copy: ${portuguese}`);
  for (const id of ['inicio', 'sobre', 'seguranca', 'projetos', 'processo', 'contato']) assert.ok(page.includes(`id="${id}"`), `/${path} anchor ${id}`);
}

// Theme: chosen before first paint. The opening stands on the official symbol files.
assert.match(html, /localStorage\.getItem\('theme'\)/, 'Theme is applied by an inline script before paint');
assert.ok(html.includes('class="for-light" src="/brand/symbol-navy.svg"'), 'Opening stands on the official symbol');
assert.ok(html.includes('src="/brand/logo-light.svg"'), 'Dark theme uses the official light logo');

console.log(`Verified: metadata, headings, anchors, official contacts, asset HTTP responses, byte-for-byte SVG/font integrity, PT/EN/JA routes and copy, theme boot. Initial script source: ${Math.round(transferred / 1024)} KiB uncompressed.`);
