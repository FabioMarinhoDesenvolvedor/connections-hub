import { NextResponse } from 'next/server';
import { getDraft, imageData, listImages, markReview } from '@/lib/editor/drafts';
import { pushReview, reviewState, type ReviewFile } from '@/lib/editor/github';
import { editorRoute, UUID } from '@/lib/editor/guard';
import { brasiliaNow, indexMd, problems, referencedImages } from '@/lib/editor/post-file';

/*
  POST: writes the draft to the repository as a pull request (or updates the open one), so
  Vercel builds a preview and the post can be reviewed. The day of the first review names the
  folder and is the post's date (noon in Brasília). GET: the pull request, its checks and the preview address.
*/
export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: RouteContext<'/api/admin/posts/[id]/review'>) {
  return editorRoute(request, async () => {
    const { id } = await params;
    const draft = UUID.test(id) ? await getDraft(id) : null;
    if (!draft) return NextResponse.json({ error: 'Rascunho não encontrado.' }, { status: 404 });
    if (draft.status === 'published') return NextResponse.json({ error: 'Este post já foi publicado.' }, { status: 409 });
    const images = await listImages(id);
    const found = problems(draft, images);
    if (found.length) return NextResponse.json({ problems: found }, { status: 422 });

    const now = brasiliaNow();
    const folder = draft.folder ?? `${now.year}/${now.month}/${now.day}-${draft.slug}`;
    // Noon in Brasília on the folder's day: the same date on every update of the review.
    const [year, month, day] = folder.split(/[/-]/);
    const date = `${year}-${month}-${day}T12:00:00-03:00`;
    const used = new Set(referencedImages(draft.body));
    const files: ReviewFile[] = [{ path: `content/blog/${folder}/index.md`, text: indexMd(draft, date) }];
    for (const image of images.filter(i => used.has(i.name))) {
      const data = await imageData(id, image.name);
      if (data) files.push({ path: `content/blog/${folder}/${image.name}`, base64: data.toString('base64') });
    }
    const branch = draft.branch ?? `post/${draft.slug}`;
    const { prNumber } = await pushReview({
      branch, files, prNumber: draft.prNumber,
      message: `post: ${draft.title}${draft.branch ? ' (revisão)' : ''}\n\nEnviado pelo editor do painel.`,
      title: `post: ${draft.title}`,
      body: `Post escrito no editor do painel (/admin/posts).\n\n- **Tipo:** ${draft.kind}\n- **Temas:** ${draft.tags}\n- **Arquivo:** \`content/blog/${folder}/index.md\`\n\nPara revisar, peça ao Claude: "revise o PR deste post" (regras em \`content/blog/GUIA.md\`). Para publicar, use o botão **Publicar** no editor.`,
    });
    await markReview(id, { folder, branch, prNumber });
    return NextResponse.json({ ok: true, prNumber });
  });
}

export async function GET(request: Request, { params }: RouteContext<'/api/admin/posts/[id]/review'>) {
  return editorRoute(request, async () => {
    const { id } = await params;
    const draft = UUID.test(id) ? await getDraft(id) : null;
    if (!draft?.prNumber || !draft.branch) return NextResponse.json({ state: null });
    return NextResponse.json({ state: await reviewState(draft.prNumber, draft.branch) });
  });
}
