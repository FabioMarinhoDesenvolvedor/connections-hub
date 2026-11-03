import { Arrow } from '@/components/arrow';

const ERRORS: Record<string, string> = {
  estado: 'O login expirou ou veio de outro lugar. Tente de novo.',
  github: 'O GitHub não confirmou o login. Tente de novo.',
  conta: 'Esta conta do GitHub não tem acesso ao painel.',
};

// What the panel shows without the owner's session: only the way in.
export function SignIn({ error }: { error?: string }) {
  return <main id="conteudo" className="admin shell">
    <p className="label"><span className="point" aria-hidden="true" />Painel</p>
    <h1 className="admin-title">Connections Hub</h1>
    {error && ERRORS[error] && <p className="comment-status" data-tone="error" role="alert" style={{ display: 'block' }}>{ERRORS[error]}</p>}
    <p className="admin-lead">Só a conta do dono entra aqui.</p>
    <a className="button button-primary" href="/api/auth/github">Entrar com GitHub<Arrow /></a>
  </main>;
}
