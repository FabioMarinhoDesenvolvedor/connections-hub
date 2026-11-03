// The panel's two places and the way out. Server-rendered; the logout is a plain form.
export function AdminNav({ current, login }: { current: 'posts' | 'comentarios'; login: string }) {
  return <header className="admin-head">
    <div>
      <p className="label"><span className="point" aria-hidden="true" />Painel · {login}</p>
      <nav className="admin-nav" aria-label="Painel">
        <a href="/admin/posts" aria-current={current === 'posts' ? 'page' : undefined}>Posts</a>
        <a href="/admin/comentarios" aria-current={current === 'comentarios' ? 'page' : undefined}>Comentários</a>
        <a href="/blog" target="_blank" rel="noopener">Ver o blog ↗</a>
      </nav>
    </div>
    <form method="post" action="/api/auth/logout"><button className="button button-secondary button-small" type="submit">Sair</button></form>
  </header>;
}
