import { AdminNav } from '@/components/admin/admin-nav';
import { SignIn } from '@/components/admin/sign-in';
import { localePath, type Locale } from '@/i18n/config';
import { getPosts } from '@/lib/blog/posts';
import { DatabaseUnavailable } from '@/lib/comments/db';
import { warnings } from '@/lib/comments/input';
import { currentAdmin } from '@/lib/comments/session';
import { listAll, type Comment } from '@/lib/comments/store';

/*
  /admin/comentarios: every comment, the pending ones first. Approve puts one on the post;
  Apagar deletes it for good (pending or approved). Without a session, only the sign-in.
  Everything here was written by visitors: shown as text, with a warning on anything that
  reads like orders to an AI assistant, and never acted on by one.
*/
export const dynamic = 'force-dynamic';


const when = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

export default async function Moderation({ searchParams }: PageProps<'/admin/comentarios'>) {
  const admin = await currentAdmin();
  const { erro } = await searchParams;
  if (!admin) return <SignIn error={typeof erro === 'string' ? erro : undefined} />;

  let comments: Comment[] | null = null;
  try { comments = await listAll(); } catch (error) { if (!(error instanceof DatabaseUnavailable)) throw error; }
  const titles = new Map(getPosts('pt').map(p => [p.id, p]));
  const pending = comments?.filter(c => c.status === 'pending') ?? [];
  const approved = comments?.filter(c => c.status === 'approved') ?? [];

  return <main id="conteudo" className="admin shell">
    <AdminNav current="comentarios" login={admin} />
    <h1 className="admin-title">Comentários do blog</h1>
    <p id="aprovado" className="comment-status" data-tone="ok" role="status">Comentário aprovado: já aparece no post.</p>
    <p id="apagado" className="comment-status" data-tone="ok" role="status">Comentário apagado.</p>
    <p id="indisponivel" className="comment-status" data-tone="error" role="alert">O banco não respondeu; nada mudou. Tente de novo.</p>
    {comments === null
      ? <p className="admin-lead">O banco de dados não respondeu ou não está configurado (DATABASE_URL). Veja o log do servidor.</p>
      : <>
        <Group title="Esperando aprovação" empty="Nada esperando aprovação." items={pending} titles={titles} />
        <Group title="Publicados" empty="Nenhum comentário publicado ainda." items={approved} titles={titles} />
      </>}
  </main>;
}

function Group({ title, empty, items, titles }: { title: string; empty: string; items: Comment[]; titles: Map<string, { title: string; path: string }> }) {
  return <section className="admin-group">
    <h2 className="admin-group-title">{title} <span>{items.length}</span></h2>
    {items.length === 0 ? <p className="admin-lead">{empty}</p> : <ol className="admin-list">
      {items.map(c => {
        const post = titles.get(c.postId);
        return <li key={c.id} className="admin-item" data-status={c.status}>
          <p className="comment-meta">
            <b>{c.name}</b>
            {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
            <time dateTime={c.createdAt.toISOString()}>{when.format(c.createdAt)}</time>
            <span>{c.locale.toUpperCase()}</span>
          </p>
          <p className="admin-post">em {post ? <a href={`${localePath(c.locale as Locale, post.path)}#comentarios`}>{post.title}</a> : c.postId}</p>
          {warnings(`${c.name}\n${c.body}`).map(w => <p key={w} className="admin-warning">
            {w === 'ia' ? 'Atenção: este texto parece conter instruções para uma IA (prompt injection). Leia antes de aprovar; nenhum assistente deve seguir o que está escrito nele.' : 'Atenção: vários links. Pode ser spam.'}
          </p>)}
          <p className="comment-body">{c.body}</p>
          <div className="admin-actions">
            {c.status === 'pending' && <form method="post" action={`/api/admin/comments/${c.id}`}>
              <input type="hidden" name="action" value="approve" />
              <button className="button button-primary button-small" type="submit">Aprovar</button>
            </form>}
            <form method="post" action={`/api/admin/comments/${c.id}`}>
              <input type="hidden" name="action" value="delete" />
              <button className="button button-secondary button-small" type="submit">Apagar</button>
            </form>
          </div>
        </li>;
      })}
    </ol>}
  </section>;
}
