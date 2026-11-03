import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { siteOrigin } from '@/data/site';

/*
  The owner's login to the moderation panel. GitHub says who the person is (see
  app/api/auth/github); this keeps them signed in with one HttpOnly cookie, signed with
  SESSION_SECRET, for 12 hours. It is the only cookie the site sets, and only for the owner.
*/
export const SESSION_COOKIE = 'ch_admin';
/** Short-lived, only during the GitHub round trip: proves the answer belongs to this sign-in. */
export const STATE_COOKIE = 'ch_oauth_state';
const HOURS = 12;

export const secret = () => {
  const value = process.env.SESSION_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === 'development') return 'dev-only-secret-dev-only-secret!!';
  throw new Error('SESSION_SECRET must be set (32 characters or more)');
};

const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url');

/** The GitHub login allowed to moderate (ADMIN_GITHUB_LOGIN, case-insensitive). */
export const adminLogin = () => (process.env.ADMIN_GITHUB_LOGIN || 'FabioMarinhoDesenvolvedor').toLowerCase();

export function sessionValue(login: string): { value: string; maxAge: number } {
  const payload = Buffer.from(JSON.stringify({ login: login.toLowerCase(), exp: Date.now() + HOURS * 3600_000 })).toString('base64url');
  return { value: `${payload}.${sign(payload)}`, maxAge: HOURS * 3600 };
}

export function readSession(value: string | undefined): string | null {
  if (!value) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { login, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof login === 'string' && login === adminLogin() && typeof exp === 'number' && exp > Date.now() ? login : null;
  } catch {
    return null;
  }
}

/** The signed-in owner, or null. For Server Components and Route Handlers. */
export async function currentAdmin(): Promise<string | null> {
  return readSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge,
});

/*
  Where redirects go. The Host header names the address the visitor used (request.url can
  name another one: the dev server reports localhost), but anyone can send any Host, so it is
  only used when it is one of this site's own addresses: the production domain, the Vercel
  deployment and branch URLs, or a local server. Anything else falls back to the production
  domain, so a forged header can never turn a redirect into a link to another site.
*/
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
function allowedHosts(): Set<string> {
  const hosts = [new URL(siteOrigin()).host, process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL];
  return new Set(hosts.filter((h): h is string => Boolean(h)).map(h => h.toLowerCase()));
}

export function originOf(request: Request): string {
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').toLowerCase();
  if (LOCAL.test(host) && !process.env.VERCEL) return `http://${host}`; // a server on this machine
  if (allowedHosts().has(host)) return `https://${host}`;
  return siteOrigin();
}

/** An absolute URL on this site, for redirects. */
export const here = (request: Request, path: string) => new URL(path, originOf(request));

/*
  Form posts must come from a page of this same site (the cookie is SameSite=Lax; this is a
  second lock). A browser always sends the real Origin and Host, so a page on another site
  cannot pass this check on a visitor's behalf.
*/
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!origin || !host) return false;
  try { return new URL(origin).host.toLowerCase() === host.toLowerCase(); } catch { return false; }
}
