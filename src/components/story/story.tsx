import { Arrow } from '@/components/arrow';
import { ConceptFigure } from '@/components/story/concept-figure';
import { StoryStage } from '@/components/story/story-stage';
import { solutionIds } from '@/data/site';
import type { Dictionary } from '@/i18n';

/*
  01 — Hero and brand concept, one pinned stage. All copy is server-rendered HTML; the stage
  only moves it. Without JavaScript, with reduced motion or on very short screens, the same
  markup lays out as a static sequence (see .story in globals.css).

  The lockup is the official file for the theme: logo.svg on paper, logo-light.svg on ink.
  Both are in the markup; CSS shows one, and the stage measures whichever is shown.
*/
export function Story({ t }: { t: Dictionary }) {
  return <section id="inicio" className="story" data-story aria-labelledby="hero-title">
    <span id="conceito" className="story-anchor" aria-hidden="true" />
    <div className="story-pin">
      <div className="story-paper" aria-hidden="true" />
      <StoryStage />

      <header className="story-hero shell" data-story-hero>
        <p className="label"><span className="point" aria-hidden="true" />{t.hero.eyebrow}</p>
        <h1 id="hero-title" className="story-title">
          {t.hero.lines.map(line => <span key={line}>{line}</span>)}
        </h1>
        <p className="story-lead">{t.hero.lead}</p>
        <div className="actions">
          <a className="button button-primary" href="#contato">{t.hero.primary}<Arrow /></a>
          <a className="button button-secondary" href="#solucoes">{t.hero.secondary}</a>
        </div>
        <nav className="story-index" aria-label={t.hero.index}>
          {solutionIds.map(id => <a key={id} href={`#solucao-${id}`}>{t.solutions.items[id].title}</a>)}
        </nav>
      </header>

      {/* Over the seed in the hero: takes the pointer (and touch, without scrolling the page). */}
      <span className="story-seed" data-story-seed aria-hidden="true" />

      <ol className="story-chapters" aria-label={t.concept.label}>
        {t.concept.chapters.map((text, index) => <li key={text} className="story-chapter" data-chapter={index}>
          <ConceptFigure state={index} />
          <p className="story-chapter-text">{text}</p>
        </li>)}
      </ol>

      <div className="story-lockup" data-story-lockup>
        <div className="story-lockup-mark">
          <img className="for-light" src="/brand/logo.svg" width="1408" height="311" alt="Connections Hub" fetchPriority="low" />
          <img className="for-dark" src="/brand/logo-light.svg" width="1408" height="311" alt="Connections Hub" fetchPriority="low" />
        </div>
        <p className="story-lockup-line">{t.concept.lockupLine}</p>
      </div>

      {/* Shown only when the seed is played open in the hero (see story-stage.tsx). */}
      <p className="story-secret" data-story-secret aria-hidden="true">
        <span className="story-secret-title"><span className="point" />{t.concept.secret.title}</span>
        <span className="story-secret-hint">{t.concept.secret.hint}</span>
      </p>

      <a className="story-cue" href="#conceito" data-story-cue><span aria-hidden="true" />{t.concept.cue}</a>
    </div>
  </section>;
}
