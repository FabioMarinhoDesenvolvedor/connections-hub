import type { CSSProperties } from 'react';
import { Arrow } from '@/components/arrow';
import { HeroLogo } from '@/components/hero/hero-logo';
import { solutionIds } from '@/data/site';
import type { Dictionary } from '@/i18n';

/*
  01 — Opening. One screen: the copy on the left (above, on phones) and, beside it, the
  official symbol as a 3D object that spins in and stays alive, in front of frosted glass, with
  its official colourways (hero-logo.tsx, DESIGN.md §12). A numbered index of the solutions
  closes it. No pinning. All copy is server-rendered HTML.
*/
export function Hero({ t }: { t: Dictionary }) {
  return <section id="inicio" className="hero" aria-labelledby="hero-title">
    <div className="hero-paper" aria-hidden="true" />
    <div className="shell hero-grid">
      <header className="hero-copy">
        <p className="label hero-rise" style={{ '--i': 0 } as CSSProperties}><span className="point" aria-hidden="true" />{t.hero.eyebrow}</p>
        <h1 id="hero-title" className="hero-title">
          {t.hero.lines.map(line => <span key={line}>{line}</span>)}
        </h1>
        <p className="hero-lead hero-rise" style={{ '--i': 1 } as CSSProperties}>{t.hero.lead}</p>
        <div className="actions hero-rise" style={{ '--i': 2 } as CSSProperties}>
          <a className="button button-primary" href="#contato">{t.hero.primary}<Arrow /></a>
          <a className="button button-secondary" href="#solucoes">{t.hero.secondary}</a>
        </div>
        <nav className="hero-index hero-rise" style={{ '--i': 3 } as CSSProperties} aria-label={t.hero.index}>
          {solutionIds.map((id, i) => <a key={id} href={`#solucao-${id}`}><span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>{t.solutions.items[id].title}</a>)}
        </nav>
      </header>
      <HeroLogo t={t.hero} />
    </div>
  </section>;
}
