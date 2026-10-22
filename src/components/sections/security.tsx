import { SectionHead } from '@/components/section-head';
import { Vault } from '@/components/security/vault';
import type { Dictionary } from '@/i18n';

/*
  02b — Security, right after About. One message: the sites Connections Hub
  builds are secure, and this one is the proof. The piece is this site's own security code,
  encrypted for real in the visitor's browser (components/security/vault.tsx), in a navy window
  like the brand's surfaces; three short
  pillars say what that means. Every claim is configured in src/lib/security-headers.ts.
*/
export function Security({ t }: { t: Dictionary['security'] }) {
  return <section id="seguranca" className="security" aria-labelledby="security-title">
    <div className="shell security-grid">
      <div className="security-copy">
        <SectionHead label={t.label} id="security-title" lines={t.title} intro={t.lead} />
        <ul className="security-pillars" data-reveal="rules">
          {t.pillars.map(item => <li key={item.title}><span className="point" aria-hidden="true" /><b>{item.title}</b><span>{item.text}</span></li>)}
        </ul>
      </div>
      <div className="security-piece" data-reveal>
        <Vault copy={t.vault} />
      </div>
    </div>
  </section>;
}
