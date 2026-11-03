import { NextResponse } from 'next/server';
import { DatabaseUnavailable } from '@/lib/comments/db';
import { approve, remove } from '@/lib/comments/store';
import { currentAdmin, here, sameOrigin } from '@/lib/comments/session';

// Moderation from the panel: approve a pending comment, or delete any comment for good.
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function POST(request: Request, { params }: RouteContext<'/api/admin/comments/[id]'>) {
  const { id } = await params;
  if (!sameOrigin(request) || !(await currentAdmin())) return new NextResponse('Forbidden', { status: 403 });
  if (!UUID.test(id)) return new NextResponse('Not found', { status: 404 });
  const action = String((await request.formData()).get('action') ?? '');
  if (action !== 'approve' && action !== 'delete') return new NextResponse('Bad request', { status: 400 });
  try {
    await (action === 'approve' ? approve(id) : remove(id));
  } catch (error) {
    if (!(error instanceof DatabaseUnavailable)) throw error;
    return NextResponse.redirect(here(request, '/admin/comentarios#indisponivel'), 303);
  }
  return NextResponse.redirect(here(request, `/admin/comentarios#${action === 'approve' ? 'aprovado' : 'apagado'}`), 303);
}
