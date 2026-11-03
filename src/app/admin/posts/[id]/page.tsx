import { notFound } from 'next/navigation';
import { AdminNav } from '@/components/admin/admin-nav';
import { Editor } from '@/components/admin/editor';
import { SignIn } from '@/components/admin/sign-in';
import { postKinds } from '@/lib/blog/posts';
import { currentAdmin } from '@/lib/comments/session';
import { getDraft, listImages } from '@/lib/editor/drafts';
import { githubConfigured } from '@/lib/editor/github';
import { UUID } from '@/lib/editor/guard';

// One draft in the editor (components/admin/editor.tsx does the work in the browser).
export const dynamic = 'force-dynamic';

export default async function EditPost({ params }: PageProps<'/admin/posts/[id]'>) {
  const admin = await currentAdmin();
  if (!admin) return <SignIn />;
  const { id } = await params;
  const draft = UUID.test(id) ? await getDraft(id) : null;
  if (!draft) notFound();
  const images = await listImages(id);
  return <main id="conteudo" className="admin admin-wide shell">
    <AdminNav current="posts" login={admin} />
    <Editor draft={{ ...draft, updatedAt: draft.updatedAt.toISOString() }} images={images} kinds={[...postKinds]} canReview={githubConfigured()} />
  </main>;
}
