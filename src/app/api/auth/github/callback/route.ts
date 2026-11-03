import { timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminLogin, cookieOptions, here, SESSION_COOKIE, sessionValue, STATE_COOKIE } from '@/lib/comments/session';

// GitHub sends the owner back here: check the state, ask GitHub who it is, let only the owner in.
export const dynamic = 'force-dynamic';

const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') ?? '';
  const expected = (await cookies()).get(STATE_COOKIE)?.value ?? '';
  const denied = (reason: string) => {
    const response = NextResponse.redirect(here(request, `/admin/comentarios?erro=${reason}`), 303);
    response.cookies.delete(STATE_COOKIE);
    return response;
  };
  if (!code || !expected || !same(state, expected)) return denied('estado');

  const token = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code }),
  }).then(r => r.json()).catch(() => null) as { access_token?: string } | null;
  if (!token?.access_token) return denied('github');

  const user = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'connections-hub' },
  }).then(r => r.json()).catch(() => null) as { login?: string } | null;
  if (!user?.login || user.login.toLowerCase() !== adminLogin()) return denied('conta');

  const response = NextResponse.redirect(here(request, '/admin/comentarios'), 303);
  response.cookies.delete(STATE_COOKIE);
  const { value, maxAge } = sessionValue(user.login);
  response.cookies.set(SESSION_COOKIE, value, cookieOptions(maxAge));
  return response;
}
