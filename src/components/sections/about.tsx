import { AboutBoard } from '@/components/about/board';
import { SectionHead } from '@/components/section-head';
import type { Dictionary } from '@/i18n';

// 02 — Who the company is: the conviction, a line that keeps naming what we build, the two
// paragraphs, and the four facts as cards that lead to the sections proving them.
export function About({ t }: { t: Dictionary['about'] }) {
  return <section id="sobre" className="about" aria-labelledby="about-title">
    <div className="shell about-grid">
      <SectionHead label={t.label} id="about-title" lines={t.title} className="about-head" />
      <AboutBoard t={t} />
      <div className="about-copy" data-reveal>
        {t.paragraphs.map(text => <p key={text}>{text}</p>)}
      </div>
    </div>
  </section>;
}
