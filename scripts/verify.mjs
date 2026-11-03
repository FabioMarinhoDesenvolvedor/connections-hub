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
assert.ok(html.includes('primeira linha.') && html.includes('frame-ancestors'), 'Security section rendered as HTML');
assert.ok(!html.includes('class="code-term"'), 'The code terminal is gone (replaced by Security)');
for (const step of ['Entendemos', 'Planejamos', 'Desenvolvemos', 'Implementamos']) assert.ok(html.includes(step), `Preserved process: ${step}`);
for (const text of ['Código em uso.', 'Marketing Dashboard', 'WorkHub', 'WSN Loja', 'Tasks', '/api/cards/{id}/enviar-ao-cliente', 'card_approved_snapshots', 'Ver em ação', 'dados fictícios']) assert.ok(html.includes(text), `Projects rendered as HTML: ${text}`);
for (const removed of ['Clozi', 'Cifra Pompeia', 'Tina Tur']) assert.ok(!html.includes(removed), `Project no longer shown: ${removed}`);
assert.ok(html.includes('href="https://github.com/FabioMarinhoDesenvolvedor"'), 'GitHub profile linked');
for (const photo of ['brand-office', 'brand-people', 'brand-technology']) assert.ok(!html.includes(photo), `No office or team mockup published: ${photo}`);
for (const image of ['alcool-gel', 'detergente', 'luva-nitrilica', 'papel-toalha']) assert.equal((await fetch(`${origin}/projects/wsn/${image}.webp`)).status, 200, `WSN product image ${image}`);
for (const id of ['inicio', 'sobre', 'seguranca', 'solucoes', 'solucao-sites', 'solucao-sistemas', 'solucao-dashboards', 'solucao-ecommerce', 'projetos', 'projeto-marketing', 'processo', 'contato']) assert.ok(html.includes(`id="${id}"`), `Anchor ${id}`);
for (const link of ['https://wa.me/5511974589226', 'mailto:contato@connectionshub.com.br', 'tel:+5511974589226']) assert.ok(html.includes(link), `Official channel ${link}`);
for (const asset of ['/brand/logo.svg', '/brand/logo-light.svg', '/brand/signature-sand.svg', '/brand/ring-orange.svg', '/images/social.jpg', '/fonts/Satoshi-Variable.woff2', '/favicon.png', '/robots.txt', '/sitemap.xml']) assert.equal((await fetch(origin + asset)).status, 200, asset);
// Byte-for-byte integrity against the brand's source files. They are not in the repository,
// so on a machine without Referências/ this check is skipped (and said so), not failed.
const originals = path.resolve('Referências/CONNECTIONS HUB ID VISUAL/SVG');
let integrity = 'byte-for-byte SVG/font integrity';
const hasReferences = await fs.access(originals).then(() => true, () => false);
if (hasReferences) {
  const files = await fs.readdir(originals);
  const hash = data => crypto.createHash('sha256').update(data).digest('hex');
  const originalHashes = new Set(await Promise.all(files.map(async file => hash(await fs.readFile(path.join(originals, file))))));
  for (const file of await fs.readdir('public/brand')) assert.ok(originalHashes.has(hash(await fs.readFile(path.join('public/brand', file)))), `${file} must be an unchanged official SVG`);
  assert.equal(hash(await fs.readFile('public/fonts/Satoshi-Variable.woff2')), hash(await fs.readFile('Referências/FONTE_ Satoshi_Complete/Fonts/WEB/fonts/Satoshi-Variable.woff2')), 'Official Satoshi must be intact');
} else {
  integrity = 'SVG/font integrity SKIPPED (no Referências/ on this machine)';
  console.warn('Warning: Referências/ not found; the byte-for-byte check of the brand files was skipped.');
}
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
  for (const portuguese of ['Fale conosco', 'Soluções', 'primeira linha.', 'Você recebe', 'Construindo soluções.']) assert.ok(!copy.includes(portuguese), `/${path} has no Portuguese copy: ${portuguese}`);
  for (const id of ['inicio', 'sobre', 'seguranca', 'solucoes', 'projetos', 'processo', 'contato']) assert.ok(page.includes(`id="${id}"`), `/${path} anchor ${id}`);
}

// Theme: chosen before first paint. The opening stands on the official symbol files.
assert.match(html, /localStorage\.getItem\('theme'\)/, 'Theme is applied by an inline script before paint');
assert.ok(html.includes('class="for-light" src="/brand/symbol-navy.svg"'), 'Opening stands on the official symbol');
assert.ok(html.includes('src="/brand/logo-light.svg"'), 'Dark theme uses the official light logo');

// Blog: served at /blog in Portuguese (/pt/blog redirects there) and under each language
// prefix, with its feed and sitemap entries. Drafts never reach a production build.
assert.ok(html.includes('href="/blog"'), 'Home links to the blog');
assert.equal((await fetch(origin + '/pt/blog', { redirect: 'manual' })).status, 308, '/pt/blog redirects to /blog');
for (const blog of ['/blog', '/en/blog', '/ja/blog', '/blog/anuncios']) {
  const response = await fetch(origin + blog);
  assert.equal(response.status, 200, blog);
  const page = await response.text();
  assert.equal((page.match(/<h1\b/g) || []).length, 1, `${blog} has exactly one h1`);
  assert.match(page, /rel="canonical"/, `${blog} canonical`);
}
const feed = await fetch(origin + '/blog/rss.xml');
assert.equal(feed.status, 200, 'RSS feed');
assert.match(feed.headers.get('content-type') || '', /rss\+xml/, 'RSS content type');
const rss = await feed.text();
assert.match(rss, /<rss version="2.0"/, 'RSS 2.0 document');
const sitemapXml = await (await fetch(origin + '/sitemap.xml')).text();
assert.ok(sitemapXml.includes('/blog</loc>'), 'Sitemap lists the blog');
const draft = '/blog/2026/11/03/exemplo-de-post';
if (process.env.BLOG_DRAFTS !== '1') {
  assert.equal((await fetch(origin + draft)).status, 404, 'A draft is not published');
  assert.ok(!rss.includes('exemplo-de-post') && !sitemapXml.includes('exemplo-de-post'), 'A draft is not in the feed or the sitemap');
} else {
  const post = await (await fetch(origin + draft)).text();
  assert.match(post, /name="robots" content="noindex/, 'A draft shown for review is not indexed');
  assert.ok(post.includes('class="post-code"') && post.includes('tk-keyword'), 'Code blocks use the site highlighter');
  assert.ok(/<img[^>]+width="\d+"[^>]+height="\d+"/.test(post), 'Post images carry their size');
  assert.equal((await fetch(origin + draft + '/capa.jpg')).status, 200, 'Post images are served next to the post');
}

// Comments: the moderation panel is closed without the owner's session and never indexed;
// the API refuses malformed requests and moderation without a session. A missing database
// (no DATABASE_URL here) is reported as 503, never as an error page.
const panel = await fetch(origin + '/admin/comentarios');
assert.equal(panel.status, 200, 'Moderation panel answers');
const panelHtml = await panel.text();
assert.ok(panelHtml.includes('href="/api/auth/github"') && !panelHtml.includes('/api/admin/comments/'), 'Without a session the panel only offers sign-in');
assert.match(panelHtml, /name="robots" content="noindex/, 'Moderation panel is not indexed');
assert.equal((await fetch(origin + '/api/admin/comments/00000000-0000-0000-0000-000000000000', { method: 'POST', headers: { Origin: origin }, body: new URLSearchParams({ action: 'delete' }) })).status, 403, 'Moderation needs the owner');
assert.equal((await fetch(origin + '/api/comments?post=..%2Fetc')).status, 400, 'Comment API rejects a malformed post id');
// The post editor: closed without the owner's session, page and API alike.
const editorPanel = await (await fetch(origin + '/admin/posts')).text();
assert.ok(editorPanel.includes('href="/api/auth/github"') && !editorPanel.includes('Novo post'), 'Without a session the editor only offers sign-in');
assert.equal((await fetch(origin + '/api/admin/posts', { method: 'POST', headers: { Origin: origin } })).status, 401, 'Creating a draft needs the owner');
assert.equal((await fetch(origin + '/api/admin/posts/00000000-0000-0000-0000-000000000000/review', { method: 'POST', headers: { Origin: origin } })).status, 401, 'Asking for a review needs the owner');
assert.equal((await fetch(origin + '/api/admin/posts', { method: 'POST', headers: { Origin: 'https://example.com' } })).status, 403, 'The editor refuses requests from another site');
assert.ok([200, 503].includes((await fetch(origin + '/api/comments?post=2026/11/03-exemplo-de-post')).status), 'Comment API answers (or says the database is not configured)');
// Bodies: a huge one is refused before it is read (no memory is filled), a compressed one is
// never inflated (decompression bombs), and a forged Host never becomes a redirect elsewhere.
const form = { 'Content-Type': 'application/x-www-form-urlencoded', Origin: origin };
assert.equal((await fetch(origin + '/api/comments', { method: 'POST', headers: { ...form, 'Content-Encoding': 'gzip' }, body: new Uint8Array([31, 139, 8, 0]) })).status, 415, 'A compressed comment body is refused, never inflated');
if (process.env.BLOG_DRAFTS === '1') {
  const post = await (await fetch(origin + draft)).text();
  assert.ok(post.includes('action="/api/comments"') && post.includes('name="website"'), 'Posts carry the comment form with its spam trap');
  const foreign = await fetch(origin + '/api/comments', { method: 'POST', redirect: 'manual', headers: { Origin: 'https://example.com' }, body: new URLSearchParams({ post: '2026/11/03-exemplo-de-post', locale: 'pt', name: 'X', body: 'hello' }) });
  assert.match(foreign.headers.get('location') || '', /#comentario-erro-invalido$/, 'A comment posted from another site is refused');
  const forged = await fetch(origin + '/api/comments', { method: 'POST', redirect: 'manual', headers: { ...form, Host: 'evil.example', Origin: 'http://evil.example' }, body: new URLSearchParams({ post: '2026/11/03-exemplo-de-post', locale: 'pt', name: 'X', body: 'hello', website: 'bot' }) });
  assert.ok(!(forged.headers.get('location') || '').includes('evil.example'), 'A forged Host never becomes a redirect to another site');
}

// Last, because the server closes this connection: the server stops reading and answers 413; the client may see that or the connection closing
// while it is still sending. Both mean the body was refused without being read.
const huge = await fetch(origin + '/api/comments', { method: 'POST', headers: form, body: 'a'.repeat(2 * 1024 * 1024) }).then(r => r.status, error => error.cause?.code ?? 'error');
assert.ok(huge === 413 || huge === 'ECONNRESET' || huge === 'EPIPE', `A huge comment body is refused (got ${huge})`);

console.log(`Verified: metadata, headings, anchors, official contacts, asset HTTP responses, ${integrity}, PT/EN/JA routes and copy, theme boot, blog routes, feed and sitemap, comments and moderation guard, post editor guard. Initial script source: ${Math.round(transferred / 1024)} KiB uncompressed.`);
