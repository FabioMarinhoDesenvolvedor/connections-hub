import { NextResponse } from 'next/server';
import { imageData, removeImage } from '@/lib/editor/drafts';
import { editorRoute, UUID } from '@/lib/editor/guard';

// A draft's image, for the preview (owner only, never cached by shared caches).
export const dynamic = 'force-dynamic';

const NAME = /^[a-z0-9-]+\.webp$/;

export async function GET(request: Request, { params }: RouteContext<'/api/admin/posts/[id]/images/[name]'>) {
  return editorRoute(request, async () => {
    const { id, name } = await params;
    const data = UUID.test(id) && NAME.test(name) ? await imageData(id, name) : null;
    if (!data) return new NextResponse('Not found', { status: 404 });
    return new NextResponse(new Uint8Array(data), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=300' } });
  });
}

export async function DELETE(request: Request, { params }: RouteContext<'/api/admin/posts/[id]/images/[name]'>) {
  return editorRoute(request, async () => {
    const { id, name } = await params;
    if (UUID.test(id) && NAME.test(name)) await removeImage(id, name);
    return NextResponse.json({ ok: true });
  });
}
