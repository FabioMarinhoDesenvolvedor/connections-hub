import type { CSSProperties } from 'react';
import { CipherBench } from '@/components/cipher-bench';
import { SectionHead } from '@/components/section-head';
import type { Dictionary } from '@/i18n';

/*
  03 — Security. What this site does (and does not do) to stay safe, and what the systems we
  deliver do, beside a bench where the visitor encrypts the site's own security policy in
  their browser. Every claim on this list is in the code: src/lib/security-headers.ts for the
  site, the project repositories for the systems. On the brand navy, like the closing.
*/
export function Security({ t }: { t: Dictionary['security'] }) {
  return <section id="seguranca" className="security surface-deep" data-nav-theme="dark" aria-labelledby="security-title">
    <div className="shell">
      <SectionHead label={t.label} id="security-title" lines={t.title} intro={t.intro} />
      <div className="security-bench" data-reveal>
        <CipherBench copy={t.bench} />
      </div>
      <div className="security-lists">
        {[{ label: t.siteLabel, items: t.site }, { label: t.systemsLabel, items: t.systems }].map(group => <div className="security-group" key={group.label}>
          <h3 className="security-group-label" data-reveal><span className="point" aria-hidden="true" />{group.label}</h3>
          <dl className="security-list" data-reveal="rules">
            {group.items.map((item, n) => <div className="security-item" key={item.title} style={{ '--n': n } as CSSProperties}>
              <dt>{item.title}</dt>
              <dd>{item.text}</dd>
            </div>)}
          </dl>
        </div>)}
      </div>
    </div>
  </section>;
}
