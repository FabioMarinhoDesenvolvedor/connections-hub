import { AdminNav } from '@/components/admin/admin-nav';
import { SignIn } from '@/components/admin/sign-in';
import { localePath } from '@/i18n/config';
import { getPosts } from '@/lib/blog/posts';
import { DatabaseUnavailable } from '@/lib/comments/db';
import { currentAdmin } from '@/lib/comments/session';
import { listDrafts, type Draft } from '@/lib/editor/drafts';
import { githubConfigured } from '@/lib/editor/github';

/*
  /admin/posts: the drafts being written (with where each one is: writing, in review) and the
  published posts. "Novo post" opens an empty draft in the editor.
*/
export const dynamic = 'force-dynamic';

const when = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
const STATUS: Record<Draft['status'], string> = { draft: 'Escrevendo', review: 'Em revisão', published: 'Publicado' };

export default async function Posts({ searchParams }: PageProps<'/admin/posts'>) {
  const admin = await currentAdmin();
  const { erro } = await searchParams;
  if (!admin) return <SignIn error={typeof erro === 'string' ? erro : undefined} />;
  let drafts: Draft[] | null = null;
  try { drafts = await listDrafts(); } catch (error) { if (!(error instanceof DatabaseUnavailable)) throw error; }
  const published = getPosts('pt').filter(p => !p.draft);

  return <main id="conteudo" className="admin shell">
    <AdminNav current="posts" login={admin} />
    <div className="admin-title-row">
      <h1 className="admin-title">Posts</h1>
      <form method="post" action="/api/admin/posts"><button className="button button-primary" type="submit">Novo post</button></form>
    </div>
    {!githubConfigured() && <p className="admin-warning">Falta o GITHUB_CONTENT_TOKEN na Vercel: dá para escrever e salvar, mas não para pedir revisão nem publicar.</p>}

    <section className="admin-group">
      <h2 className="admin-group-title">Rascunhos <span>{drafts?.length ?? 0}</span></h2>
      {drafts === null ? <p className="admin-lead">O banco de dados não respondeu ou não está configurado (DATABASE_URL).</p>
        : drafts.length === 0 ? <p className="admin-lead">Nenhum rascunho. Comece com "Novo post".</p>
        : <ol className="admin-list">
          {drafts.map(d => <li key={d.id} className="admin-item" data-status={d.status === 'review' ? 'pending' : undefined}>
            <p className="comment-meta"><b>{STATUS[d.status]}</b><time dateTime={d.updatedAt.toISOString()}>salvo {when.format(d.updatedAt)}</time></p>
            <p className="admin-post-title"><a href={`/admin/posts/${d.id}`}>{d.title || 'Sem título'}</a></p>
            {d.description && <p className="admin-lead">{d.description}</p>}
          </li>)}
        </ol>}
    </section>

    <section className="admin-group">
      <h2 className="admin-group-title">Publicados <span>{published.length}</span></h2>
      {published.length === 0 ? <p className="admin-lead">Nenhum post publicado ainda.</p>
        : <ol className="admin-list">
          {published.map(p => <li key={p.id} className="admin-item">
            <p className="comment-meta"><time dateTime={p.date.toISOString()}>{when.format(p.date)}</time><span>{p.kind}</span></p>
            <p className="admin-post-title"><a href={localePath('pt', p.path)} target="_blank" rel="noopener">{p.title} ↗</a></p>
          </li>)}
        </ol>}
      <p className="admin-lead">Para corrigir um post publicado, edite o arquivo dele em content/blog (ou me peça).</p>
    </section>
  </main>;
}
