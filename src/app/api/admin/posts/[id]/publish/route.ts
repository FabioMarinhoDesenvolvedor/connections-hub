import { NextResponse } from 'next/server';
import { localePath } from '@/i18n/config';
import { getDraft, listImages, markPublished, reviewedFingerprint } from '@/lib/editor/drafts';
import { mergeReview, reviewState } from '@/lib/editor/github';
import { editorRoute, UUID } from '@/lib/editor/guard';
import { fingerprint, indexMd, referencedImages } from '@/lib/editor/post-file';

/*
  Publishes a reviewed post: merges its pull request once Vercel's check on that exact commit
  has passed. If the draft was edited after the last review, it refuses: what would go live is
  the older version, so the owner sends the edits first ("Atualizar a revisão").
*/
export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: RouteContext<'/api/admin/posts/[id]/publish'>) {
  return editorRoute(request, async () => {
    const { id } = await params;
    const draft = UUID.test(id) ? await getDraft(id) : null;
    if (!draft?.prNumber || !draft.branch || !draft.folder) return NextResponse.json({ error: 'Peça a revisão antes de publicar.' }, { status: 409 });
    const [year0, month0, rest0] = draft.folder.split('/');
    const used = (await listImages(id)).filter(i => referencedImages(draft.body).includes(i.name)).map(i => i.name);
    const current = fingerprint(indexMd(draft, `${year0}-${month0}-${rest0.slice(0, 2)}T12:00:00-03:00`), used);
    if (current !== await reviewedFingerprint(id)) return NextResponse.json({ error: 'Você mudou o post depois da última revisão. Clique em "Atualizar a revisão" e espere o preview antes de publicar.' }, { status: 409 });
    const state = await reviewState(draft.prNumber, draft.branch);
    if (state.state === 'merged') { await markPublished(id); return NextResponse.json({ ok: true }); }
    if (state.state !== 'open') return NextResponse.json({ error: 'O PR deste post foi fechado no GitHub.' }, { status: 409 });
    if (state.checks !== 'success') return NextResponse.json({ error: state.checks === 'pending' ? 'O preview ainda está sendo gerado. Espere ficar pronto.' : 'O preview falhou na Vercel; veja o PR antes de publicar.' }, { status: 409 });
    await mergeReview(draft.prNumber, draft.branch, draft.title, state.headSha);
    await markPublished(id);
    const [year, month, rest] = draft.folder.split('/');
    return NextResponse.json({ ok: true, url: localePath('pt', `/blog/${year}/${month}/${rest.slice(0, 2)}/${rest.slice(3)}`) });
  });
}
