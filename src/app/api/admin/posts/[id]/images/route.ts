import { NextResponse } from 'next/server';
import { readBytes } from '@/lib/comments/input';
import { addImage, getDraft, listImages } from '@/lib/editor/drafts';
import { editorRoute, UUID } from '@/lib/editor/guard';
import { MAX_UPLOAD, prepareImage } from '@/lib/editor/images';

// An image dropped into the editor: checked, converted to WebP and kept with the draft.
export const dynamic = 'force-dynamic';

const MAX_IMAGES = 40;

export async function POST(request: Request, { params }: RouteContext<'/api/admin/posts/[id]/images'>) {
  return editorRoute(request, async () => {
    const { id } = await params;
    if (!UUID.test(id) || !(await getDraft(id))) return NextResponse.json({ error: 'Rascunho não encontrado.' }, { status: 404 });
    if ((await listImages(id)).length >= MAX_IMAGES) return NextResponse.json({ error: `No máximo ${MAX_IMAGES} imagens por post.` }, { status: 400 });
    const name = decodeURIComponent(request.headers.get('x-file-name') ?? 'imagem');
    const image = await prepareImage(await readBytes(request, MAX_UPLOAD), name);
    await addImage(id, image);
    return NextResponse.json({ name: image.name, width: image.width, height: image.height });
  });
}
