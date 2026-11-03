import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminLogin, cookieOptions, here, SESSION_COOKIE, sessionValue, STATE_COOKIE } from '@/lib/comments/session';

/*
  Sign-in to the moderation panel with GitHub (an OAuth App: GITHUB_CLIENT_ID and
  GITHUB_CLIENT_SECRET). Only the account in ADMIN_GITHUB_LOGIN is let in. No scope is
  requested: the site only needs to know who signed in.
  For local work only (npm run dev), ADMIN_DEV_LOGIN=1 signs in without GitHub.
*/
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'development' && process.env.ADMIN_DEV_LOGIN === '1') {
    const response = NextResponse.redirect(here(request, '/admin/comentarios'), 303);
    const { value, maxAge } = sessionValue(adminLogin());
    response.cookies.set(SESSION_COOKIE, value, cookieOptions(maxAge));
    return response;
  }
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return new NextResponse('GitHub sign-in is not configured (GITHUB_CLIENT_ID).', { status: 503 });
  const state = randomBytes(24).toString('base64url');
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', here(request, '/api/auth/github/callback').toString());
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('allow_signup', 'false');
  const response = NextResponse.redirect(authorize, 303);
  response.cookies.set(STATE_COOKIE, state, cookieOptions(600));
  return response;
}
