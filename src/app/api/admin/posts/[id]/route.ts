import { NextResponse } from 'next/server';
import { readJson } from '@/lib/comments/input';
import { deleteDraft, FIELD_LIMITS, getDraft, saveDraft, type DraftFields } from '@/lib/editor/drafts';
import { closeReview } from '@/lib/editor/github';
import { editorRoute, UUID } from '@/lib/editor/guard';
import { MAX_JSON } from '@/lib/editor/shared';

// PUT saves the editor's fields (called as the owner types); DELETE discards the draft.
export const dynamic = 'force-dynamic';

const FIELDS = Object.keys(FIELD_LIMITS) as (keyof DraftFields)[];

export async function PUT(request: Request, { params }: RouteContext<'/api/admin/posts/[id]'>) {
  return editorRoute(request, async () => {
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json({ error: 'Rascunho não encontrado.' }, { status: 404 });
    const input = await readJson(request, MAX_JSON) as Record<string, unknown>;
    const fields = {} as DraftFields;
    for (const key of FIELDS) {
      const value = typeof input?.[key] === 'string' ? (input[key] as string) : '';
      if (value.length > FIELD_LIMITS[key]) return NextResponse.json({ error: `O campo ${key} passou do limite.` }, { status: 413 });
      fields[key] = value;
    }
    if (!(await getDraft(id))) return NextResponse.json({ error: 'Rascunho não encontrado.' }, { status: 404 });
    await saveDraft(id, fields);
    return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
  });
}

export async function DELETE(request: Request, { params }: RouteContext<'/api/admin/posts/[id]'>) {
  return editorRoute(request, async () => {
    const { id } = await params;
    const draft = UUID.test(id) ? await getDraft(id) : null;
    if (!draft) return NextResponse.json({ error: 'Rascunho não encontrado.' }, { status: 404 });
    if (draft.status === 'review' && draft.prNumber && draft.branch) await closeReview(draft.prNumber, draft.branch);
    await deleteDraft(id);
    return NextResponse.json({ ok: true });
  });
}
