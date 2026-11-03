import { NextResponse } from 'next/server';
import { here, sameOrigin, SESSION_COOKIE } from '@/lib/comments/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new NextResponse('Forbidden', { status: 403 });
  const response = NextResponse.redirect(here(request, '/admin/comentarios'), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
