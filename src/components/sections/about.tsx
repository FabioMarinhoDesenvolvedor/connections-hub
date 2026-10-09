import { BrandImage } from '@/components/brand-image';
import { SectionHead } from '@/components/section-head';
import type { Dictionary } from '@/i18n';

// 02 — Who the company is, set as a specification sheet beside the official imagery.
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
      <figure className="about-figure" data-reveal="frame">
        <BrandImage name="brand-office" alt={t.imageAlt} />
        <span className="about-arc" aria-hidden="true" />
      </figure>
    </div>
  </section>;
}
