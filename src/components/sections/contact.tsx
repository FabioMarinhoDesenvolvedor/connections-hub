import { Arrow } from '@/components/arrow';
import { Sticker } from '@/components/sticker';
import { credits, site } from '@/data/site';
import type { Dictionary } from '@/i18n';

// The ending: one invitation and the two ways to answer it, stated plainly.
export function Contact({ t }: { t: Dictionary }) {
  const [user, domain] = site.contact.email.split('@');
  const c = t.contact;
  return <section id="contato" className="closing" data-nav-theme="dark" aria-labelledby="contact-title">
    <div className="shell closing-grid">
      <div className="closing-intro">
        <p className="label" data-reveal>{c.label}</p>
        <h2 id="contact-title" className="closing-title" data-reveal>{c.title}</h2>
        <p className="closing-lead" data-reveal>{c.lead}</p>
        <Sticker t={{ ...t.sticker, newTab: t.ui.newTab }} credits={credits} />
      </div>
      <div className="closing-channels" data-reveal>
        <p className="closing-channels-label">{c.channels}</p>
        <a className="channel" href={site.contact.whatsapp} target="_blank" rel="noopener noreferrer">
          <span className="channel-kind">{c.whatsapp}</span>
          <span className="channel-value">{site.contact.display}</span>
          <Arrow /><span className="sr-only"> {t.ui.newTab}</span>
        </a>
        <a className="channel" href={`mailto:${site.contact.email}`}>
          <span className="channel-kind">{c.email}</span>
          <span className="channel-value">{user}<wbr />@{domain}</span>
          <Arrow />
        </a>
        <a className="closing-phone" href={`tel:${site.contact.telephone}`}>{c.phone} {site.contact.display}</a>
      </div>
    </div>
  </section>;
}
