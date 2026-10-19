import { CodeTerminal } from '@/components/code-terminal';
import { SectionHead } from '@/components/section-head';
import type { Dictionary } from '@/i18n';

// 02 — Who the company is, set as a specification sheet, then the work itself: real code from
// the projects, typed live in a terminal in the site's colours.
export function About({ t }: { t: Dictionary['about'] }) {
  return <section id="sobre" className="about" aria-labelledby="about-title">
    <div className="shell about-grid">
      <SectionHead label={t.label} id="about-title" lines={t.title} className="about-head" />
      <div className="about-copy" data-reveal>
        {t.paragraphs.map(text => <p key={text}>{text}</p>)}
      </div>
      <dl className="spec" data-reveal="rules">
        {t.facts.map(fact => <div className="spec-row" key={fact.term}>
          <dt>{fact.term}</dt>
          <dd>{fact.detail}</dd>
        </div>)}
      </dl>
      <div className="about-code">
        <header className="about-code-head" data-reveal>
          <p className="label"><span className="point" aria-hidden="true" />{t.code.label}</p>
          <h3>{t.code.title}</h3>
          <p>{t.code.intro}</p>
        </header>
        <CodeTerminal copy={t.code} />
      </div>
    </div>
  </section>;
}
