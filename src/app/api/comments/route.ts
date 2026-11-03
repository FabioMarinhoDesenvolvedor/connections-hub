import { NextResponse } from 'next/server';
import { isLocale, localePath } from '@/i18n/config';
import { getPosts } from '@/lib/blog/posts';
import { DatabaseUnavailable } from '@/lib/comments/db';
import { here, sameOrigin } from '@/lib/comments/session';
import { approvedFor, hashIp, LIMITS, submit } from '@/lib/comments/store';

/*
  GET  ?post=2026/11/03-slug  the approved comments of a post (JSON), for the post page.
  POST (form)                 a new comment, stored as pending until the owner approves it.

  The form works without JavaScript: the answer is a redirect back to the post, to an anchor
  (#comentario-enviado, #comentario-erro-…) that the page shows with CSS alone.
  Spam: a hidden field people never fill (website), a per-person limit and a cap on pending.
*/
export const dynamic = 'force-dynamic';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request) {
  const post = new URL(request.url).searchParams.get('post') ?? '';
  if (!/^\d{4}\/\d{2}\/\d{2}-[a-z0-9-]+$/.test(post)) return NextResponse.json({ error: 'post' }, { status: 400 });
  try {
    return NextResponse.json({ comments: await approvedFor(post) }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=30' } });
  } catch (error) {
    if (error instanceof DatabaseUnavailable) return NextResponse.json({ comments: [], unavailable: true }, { status: 503 });
    throw error;
  }
}

export async function POST(request: Request) {
  const form = await request.formData();
  const field = (name: string) => String(form.get(name) ?? '').trim();
  const locale = field('locale');
  const lang = isLocale(locale) ? locale : 'pt';
  // getPosts already leaves drafts out, except in dev and in review builds (BLOG_DRAFTS=1).
  const post = getPosts(lang).find(p => p.id === field('post'));
  if (!post) return new NextResponse('Not found', { status: 404 });
  const back = (anchor: string) => NextResponse.redirect(here(request, `${localePath(lang, post.path)}#${anchor}`), 303);

  if (!sameOrigin(request)) return back('comentario-erro-invalido');
  // The hidden field: a person never sees it, a bot fills it. Pretend it worked.
  if (field('website')) return back('comentario-enviado');

  const name = field('name').replace(/\s+/g, ' ');
  const email = field('email').toLowerCase() || null;
  const body = field('body').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  if (!name || name.length > LIMITS.name || body.length < 3 || body.length > LIMITS.body || (email && (email.length > LIMITS.email || !EMAIL.test(email)))) {
    return back('comentario-erro-invalido');
  }
  // On Vercel these headers are set by the platform from the connection and cannot be forged
  // by the visitor. Self-hosted behind another proxy, make sure it overwrites them.
  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  try {
    const result = await submit({ postId: post.id, locale: lang, name, email, body, ipHash: hashIp(ip) });
    return back(result === 'ok' ? 'comentario-enviado' : result === 'limit' ? 'comentario-erro-limite' : 'comentario-erro-indisponivel');
  } catch (error) {
    if (error instanceof DatabaseUnavailable) return back('comentario-erro-indisponivel');
    throw error;
  }
}
