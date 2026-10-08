import { BrandImage } from '@/components/brand-image';
import { SectionHead } from '@/components/section-head';
import { about } from '@/data/site';

// 02 — Who the company is, set as a specification sheet beside the official imagery.
export function About() {
  return <section id="sobre" className="about" aria-labelledby="about-title">
    <div className="shell about-grid">
      <SectionHead label="Sobre" id="about-title" lines={about.title} className="about-head" />
      <div className="about-copy" data-reveal>
        {about.paragraphs.map(text => <p key={text}>{text}</p>)}
      </div>
      <dl className="spec" data-reveal="rules">
        {about.facts.map(fact => <div className="spec-row" key={fact.term}>
          <dt>{fact.term}</dt>
          <dd>{fact.detail}</dd>
        </div>)}
      </dl>
      <figure className="about-figure" data-reveal="frame">
        <BrandImage name="brand-office" alt="Mockup de marca: ambiente de trabalho com a identidade Connections Hub nas paredes." />
        <span className="about-arc" aria-hidden="true" />
      </figure>
    </div>
  </section>;
}
