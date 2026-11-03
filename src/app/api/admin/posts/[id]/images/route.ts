import { NextResponse } from 'next/server';
import { readBytes } from '@/lib/comments/input';
import { addImage, countImages, freeImageName, getDraft } from '@/lib/editor/drafts';
import { editorRoute, UUID } from '@/lib/editor/guard';
import { prepareImage } from '@/lib/editor/images';
import { MAX_IMAGES, MAX_UPLOAD } from '@/lib/editor/shared';

// An image dropped into the editor: checked, converted to WebP and kept with the draft under a free name.
export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: RouteContext<'/api/admin/posts/[id]/images'>) {
  return editorRoute(request, async () => {
    const { id } = await params;
    if (!UUID.test(id) || !(await getDraft(id))) return NextResponse.json({ error: 'Rascunho não encontrado.' }, { status: 404 });
    if (await countImages(id) >= MAX_IMAGES) return NextResponse.json({ error: `No máximo ${MAX_IMAGES} imagens por post.` }, { status: 400 });
    const name = decodeURIComponent(request.headers.get('x-file-name') ?? 'imagem');
    const prepared = await prepareImage(await readBytes(request, MAX_UPLOAD), name);
    // A second "image.png" (screenshots all have that name) becomes image-2.webp, never a replacement.
    const image = { ...prepared, name: await freeImageName(id, prepared.name) };
    await addImage(id, image);
    return NextResponse.json({ name: image.name, width: image.width, height: image.height });
  });
}
