import { NextResponse } from 'next/server';
import { createDraft } from '@/lib/editor/drafts';
import { editorRoute } from '@/lib/editor/guard';
import { here } from '@/lib/comments/session';

// "Novo post" in the panel: an empty draft, then straight into the editor.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return editorRoute(request, async () => NextResponse.redirect(here(request, `/admin/posts/${await createDraft()}`), 303));
}
