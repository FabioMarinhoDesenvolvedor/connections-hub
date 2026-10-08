import { site } from '@/data/site';
import { Arrow } from './arrow';

// Manual p.14: the horizontal logo is reserved for use as a signature. Static, full opacity.
// The page closes with the same title block it opens with: this is sheet 06 of 06.
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
      <dl className="footer-block">
        <div><dt>Projeto</dt><dd>Connections Hub</dd></div>
        <div><dt>Disciplina</dt><dd>Desenvolvimento de software sob medida</dd></div>
        <div><dt>Assinatura</dt><dd>Pessoas. Ideias. Tecnologia.</dd></div>
        <div><dt>Folha</dt><dd>06 / 06</dd></div>
        <div><dt>©</dt><dd>{new Date().getFullYear()}</dd></div>
        <div><dt>Início</dt><dd><a href="#inicio">Voltar ao topo <span aria-hidden="true">↑</span></a></dd></div>
      </dl>
    </div>
  </footer>;
}
