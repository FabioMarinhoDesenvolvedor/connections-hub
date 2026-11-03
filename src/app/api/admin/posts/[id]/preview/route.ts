import { NextResponse } from 'next/server';
import { readJson } from '@/lib/comments/input';
import { renderMarkdown } from '@/lib/blog/markdown';
import { FIELD_LIMITS, listImages } from '@/lib/editor/drafts';
import { editorRoute, UUID } from '@/lib/editor/guard';

// The editor's preview: the text through the same pipeline as the published post.
export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: RouteContext<'/api/admin/posts/[id]/preview'>) {
  return editorRoute(request, async () => {
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json({ error: 'Rascunho não encontrado.' }, { status: 404 });
    const input = await readJson(request, 256 * 1024) as { body?: unknown };
    const body = typeof input?.body === 'string' ? input.body.slice(0, FIELD_LIMITS.body) : '';
    const images = new Map((await listImages(id)).map(i => [i.name, { width: i.width, height: i.height }]));
    const { html, minutes } = await renderMarkdown(body, 'pt', `/api/admin/posts/${id}/images`, images);
    return NextResponse.json({ html, minutes });
  });
}
