import { Arrow } from '@/components/arrow';
import { site } from '@/data/site';
import type { Dictionary, Locale } from '@/i18n';
import { LIMITS } from '@/lib/comments/limits';
import { CommentList } from './comment-list';
import { fill } from './format';

/*
  The end of a post: the approved comments and a form to send one for approval.
  The form is plain HTML and works without JavaScript. The answer comes back as an anchor
  (#comentario-enviado, #comentario-erro-…) that CSS reveals with :target, so the page stays
  static. Only the list of approved comments is fetched in the browser (comment-list.tsx).
*/
export function Comments({ postId, locale, title, t }: { postId: string; locale: Locale; title: string; t: Dictionary['blog'] }) {
  const c = t.comments;
  const mail = `mailto:${site.contact.email}?subject=${encodeURIComponent(fill(t.reply.subject, { title }))}`;
  return <section id="comentarios" className="comments" aria-labelledby="post-comentarios">
    <header className="comments-head">
      <h2 id="post-comentarios" className="comments-title">{c.title}</h2>
      <p className="comments-intro">{c.intro}</p>
    </header>

    <CommentList postId={postId} locale={locale} t={{ count: c.count, empty: c.empty, loading: c.loading, unavailable: c.unavailable }} />
    <noscript><p className="comments-state">{c.noscript}</p></noscript>

    <form className="comment-form" method="post" action="/api/comments" aria-labelledby="comentario-form-titulo">
      <h3 id="comentario-form-titulo" className="label"><span className="point" aria-hidden="true" />{c.form.title}</h3>
      <p id="comentario-enviado" className="comment-status" data-tone="ok" role="status">{c.sent}</p>
      {(Object.keys(c.errors) as (keyof typeof c.errors)[]).map(code =>
        <p key={code} id={`comentario-erro-${code}`} className="comment-status" data-tone="error" role="alert">{c.errors[code]}</p>)}
      <input type="hidden" name="post" value={postId} />
      <input type="hidden" name="locale" value={locale} />
      {/* Hidden from people (and from assistive tech); a bot that fills it is ignored. */}
      <div className="comment-trap" aria-hidden="true">
        <label>Website <input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div className="comment-fields">
        <label className="field">
          <span>{c.form.name}</span>
          <input name="name" required maxLength={LIMITS.name} autoComplete="name" />
        </label>
        <label className="field">
          <span>{c.form.email}</span>
          <input name="email" type="email" maxLength={LIMITS.email} autoComplete="email" />
        </label>
      </div>
      <label className="field">
        <span>{c.form.body}</span>
        <textarea name="body" required minLength={3} maxLength={LIMITS.body} rows={6} />
      </label>
      <div className="comment-actions">
        <button type="submit" className="button button-primary">{c.form.send}<Arrow /></button>
        <p className="comment-note">{fill(c.form.note, { email: site.contact.email })}</p>
      </div>
    </form>

    <p className="comments-mail">{t.reply.prefer} <a className="text-link" href={mail}>{t.reply.email}<Arrow /></a></p>
  </section>;
}
