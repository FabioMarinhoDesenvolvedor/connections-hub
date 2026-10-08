import { Arrow } from '@/components/arrow';
import { ConceptFigure } from '@/components/story/concept-figure';
import { StoryStage } from '@/components/story/story-stage';
import { concept, hero, solutions } from '@/data/site';

/*
  01 — Hero and brand concept, one pinned stage. All copy is server-rendered HTML; the stage
  only moves it. Without JavaScript, with reduced motion or on very short screens, the same
  markup lays out as a static sequence (see .story in globals.css).
*/
export function Story() {
  return <section id="inicio" className="story" data-story aria-labelledby="hero-title">
    <span id="conceito" className="story-anchor" aria-hidden="true" />
    <div className="story-pin">
      <div className="story-paper" aria-hidden="true" />
      <StoryStage />

      <header className="story-hero shell" data-story-hero>
        <p className="label"><span className="point" aria-hidden="true" />{hero.eyebrow}</p>
        <h1 id="hero-title" className="story-title">
          {hero.lines.map(line => <span key={line}>{line}</span>)}
        </h1>
        <p className="story-lead">{hero.lead}</p>
        <div className="actions">
          <a className="button button-primary" href="#contato">Fale sobre seu projeto<Arrow /></a>
          <a className="button button-secondary" href="#solucoes">Ver soluções</a>
        </div>
        <nav className="story-index" aria-label="Soluções">
          {solutions.map(item => <a key={item.id} href={`#solucao-${item.id}`}><span>{item.number}</span>{item.title}</a>)}
        </nav>
      </header>

      <ol className="story-chapters" aria-label="O conceito da marca">
        {concept.map((item, index) => <li key={item.number} className="story-chapter" data-chapter={index}>
          <ConceptFigure state={index} />
          <p className="story-chapter-count"><span>{item.number}</span><i aria-hidden="true" />04</p>
          <p className="story-chapter-text">{item.text}</p>
        </li>)}
      </ol>

      <div className="story-lockup" data-story-lockup>
        <div className="story-lockup-mark">
          <img src="/brand/logo.svg" width="1408" height="311" alt="Connections Hub" fetchPriority="low" />
        </div>
        <p className="story-lockup-line">Pessoas. Ideias. Tecnologia.</p>
      </div>

      <a className="story-cue" href="#conceito" data-story-cue><span aria-hidden="true" />Role para conhecer o conceito</a>
    </div>
  </section>;
}
