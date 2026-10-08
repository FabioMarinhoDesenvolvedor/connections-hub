import { site } from '@/data/site';
import { Arrow } from './arrow';

// Manual p.14: the horizontal logo is reserved for use as a signature. Static, full opacity.
export function Footer() {
  return <footer className="site-footer" data-nav-theme="dark">
    <div className="shell">
      <div className="footer-top">
        <p className="footer-tagline">Conectando ideias.<br />Construindo soluções.</p>
        <nav aria-label="Navegação do rodapé" className="footer-column">
          <p className="footer-heading">Navegação</p>
          {site.navigation.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="footer-column">
          <p className="footer-heading">Contato</p>
          <a href={site.contact.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp<Arrow /><span className="sr-only"> (abre em uma nova aba)</span></a>
          <a href={`mailto:${site.contact.email}`}>E-mail<Arrow /></a>
        </div>
      </div>
      <div className="footer-signature">
        <img src="/brand/signature-sand.svg" width="2978" height="296" alt="Connections Hub" loading="lazy" />
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Connections Hub</span>
        <span>Pessoas. Ideias. Tecnologia.</span>
        <a href="#inicio">Voltar ao início <span aria-hidden="true">↑</span></a>
      </div>
    </div>
  </footer>;
}
