import type { CSSProperties } from 'react';
import { SectionHead } from '@/components/section-head';
import { LiveChecks } from '@/components/security/live-checks';
import { Vault } from '@/components/security/vault';
import type { Dictionary } from '@/i18n';

/*
  03 — Security, on the brand navy. The vault: this site's own content policy as lacquered 3D
  pieces, encrypted for real in the visitor's browser (components/security/vault.tsx). Then
  every rule checked live against the headers this page arrived with, and, briefly, what the
  systems we deliver do. Every claim here is in the code: src/lib/security-headers.ts.
*/
export function Security({ t }: { t: Dictionary['security'] }) {
  return <section id="seguranca" className="security surface-deep" data-nav-theme="dark" aria-labelledby="security-title">
    <div className="shell">
      <SectionHead label={t.label} id="security-title" lines={t.title} intro={t.intro} />
      <div className="security-vault" data-reveal>
        <Vault copy={t.vault} />
      </div>
      <LiveChecks copy={t.live} />
      <div className="systems">
        <h3 className="systems-label" data-reveal>{t.systemsLabel}</h3>
        <ul className="systems-list" data-reveal="rules">
          {t.systems.map((item, n) => <li key={item.title} style={{ '--n': n } as CSSProperties}><b>{item.title}</b><span>{item.text}</span></li>)}
        </ul>
      </div>
    </div>
  </section>;
}
