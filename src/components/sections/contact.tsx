import { Arrow } from '@/components/arrow';
import { contact, site } from '@/data/site';

// 06 — Contact. The brand's own questions (contact story post), then two direct channels.
export function Contact() {
  const [user, domain] = site.contact.email.split('@');
  return <section id="contato" className="contact surface-deep" data-nav-theme="dark" aria-labelledby="contact-title">
    <div className="shell contact-grid">
      <div className="contact-copy">
        <p className="label" data-reveal><span className="label-index">06</span>Contato</p>
        <ul className="contact-questions" data-reveal="lines">
          {contact.questions.map(question => <li className="line" key={question}><span>{question}</span></li>)}
        </ul>
        <h2 id="contact-title" className="contact-title" data-reveal>{contact.title}</h2>
        <p className="contact-lead" data-reveal>{contact.lead}</p>
      </div>
      <div className="contact-panel" data-reveal="rules">
        <div className="actions">
          <a className="button button-light" href={site.contact.whatsapp} target="_blank" rel="noopener noreferrer">Conversar pelo WhatsApp<Arrow /><span className="sr-only"> (abre em uma nova aba)</span></a>
          <a className="button button-secondary" href={`mailto:${site.contact.email}`}>Enviar um e-mail</a>
        </div>
        <dl className="channels">
          <div><dt>WhatsApp</dt><dd><a href={`tel:${site.contact.telephone}`}>{site.contact.display}</a></dd></div>
          <div><dt>E-mail</dt><dd><a href={`mailto:${site.contact.email}`}>{user}<wbr />@{domain}</a></dd></div>
        </dl>
      </div>
    </div>
  </section>;
}
