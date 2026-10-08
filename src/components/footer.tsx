import { site } from '@/data/site';

// Continues the closing section on the same surface: the official light logo, the way back
// into the page, and the essentials. Nothing repeated from above.
export function Footer() {
  return <footer className="site-footer" data-nav-theme="dark">
    <div className="shell footer-row">
      <a href="#inicio" className="footer-logo" aria-label="Connections Hub, voltar ao início">
        <img src="/brand/logo-light.svg" width="1408" height="311" alt="" loading="lazy" />
      </a>
      <nav aria-label="Navegação do rodapé" className="footer-nav">
        {site.navigation.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}
      </nav>
      <p className="footer-legal">© {new Date().getFullYear()} Connections Hub · {site.tagline}</p>
    </div>
  </footer>;
}
