import { site } from '@/data/site';
import { Arrow } from './arrow';
import { FooterMark } from './footer-mark';

export function Footer() {
  return <footer className="site-footer" data-nav-theme="dark">
    <div className="shell">
      <div className="footer-main">
        <p className="footer-tagline">Conectando ideias.<br />Construindo soluções.</p>
        <nav aria-label="Navegação do rodapé" className="footer-links">
          {site.navigation.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="footer-links">
          <a href={site.contact.href} target="_blank" rel="noopener noreferrer">WhatsApp<Arrow diagonal /><span className="sr-only"> (abre em uma nova aba)</span></a>
          <a href={`mailto:${site.contact.email}`}>E-mail<Arrow diagonal /></a>
        </div>
      </div>
      <FooterMark />
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Connections Hub</span>
        <span>Pessoas. Ideias. Tecnologia.</span>
        <a href="#inicio">Voltar ao início <span aria-hidden="true">↑</span></a>
      </div>
    </div>
  </footer>;
}
