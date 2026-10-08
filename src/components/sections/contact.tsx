import { Arrow } from '@/components/arrow';
import { contact, site } from '@/data/site';

// The ending: one invitation and the two ways to answer it, stated plainly.
export function Contact() {
  const [user, domain] = site.contact.email.split('@');
  return <section id="contato" className="closing" data-nav-theme="dark" aria-labelledby="contact-title">
    <div className="shell closing-grid">
      <div className="closing-intro">
        <p className="label" data-reveal>Contato</p>
        <h2 id="contact-title" className="closing-title" data-reveal>{contact.title}</h2>
        <p className="closing-lead" data-reveal>{contact.lead}</p>
      </div>
      <div className="closing-channels" data-reveal>
        <p className="closing-channels-label">Fale com a Connections Hub</p>
        <a className="channel" href={site.contact.whatsapp} target="_blank" rel="noopener noreferrer">
          <span className="channel-kind">WhatsApp</span>
          <span className="channel-value">{site.contact.display}</span>
          <Arrow /><span className="sr-only"> (abre em uma nova aba)</span>
        </a>
        <a className="channel" href={`mailto:${site.contact.email}`}>
          <span className="channel-kind">E-mail</span>
          <span className="channel-value">{user}<wbr />@{domain}</span>
          <Arrow />
        </a>
        <a className="closing-phone" href={`tel:${site.contact.telephone}`}>Ou ligue: {site.contact.display}</a>
      </div>
    </div>
  </section>;
}
