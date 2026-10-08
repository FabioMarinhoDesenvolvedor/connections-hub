import { Arrow } from '@/components/arrow';
import { ConceptFigure } from '@/components/story/concept-figure';
import { StoryStage } from '@/components/story/story-stage';
import { concept, hero, process, site, solutions } from '@/data/site';

/*
  01 — Hero and brand concept, one pinned stage. All copy is server-rendered HTML; the stage
  only moves it. Without JavaScript, with reduced motion or on very short screens, the same
  markup lays out as a static sequence (see .story in globals.css).

  The hero ends in an engineering title block (the drawing convention for "what this sheet
  is"): the company's discipline, deliverables and method at a glance. During the story it
  collapses into the chapter index.
*/
export function Story() {
  return <section id="inicio" className="story" data-story aria-labelledby="hero-title">
    <span id="conceito" className="story-anchor" aria-hidden="true" />
    <div className="story-pin">
      <div className="story-paper" aria-hidden="true" data-story-paper />
      <div className="story-tint story-tint-warm" aria-hidden="true" data-tint="warm" />
      <div className="story-tint story-tint-cool" aria-hidden="true" data-tint="cool" />
      <StoryStage />

      <header className="story-hero shell" data-story-hero>
        <p className="label"><span className="point" aria-hidden="true" />{hero.eyebrow}</p>
        <h1 id="hero-title" className="story-title">
          {hero.lines.map(line => <span className="line" key={line}><span>{line}</span></span>)}
        </h1>
        <p className="story-lead">{hero.lead}</p>
        <div className="actions">
          <a className="button button-primary" href="#contato">Fale sobre seu projeto<Arrow /></a>
          <a className="button button-secondary" href="#solucoes">Ver soluções</a>
        </div>
      </header>

      <div className="title-block shell" data-title-block>
        <dl className="title-block-facts" data-title-facts>
          <div className="title-cell title-cell-wide"><dt>Entregas</dt><dd>
            {solutions.map((item, i) => <span key={item.id}>{i > 0 && <i aria-hidden="true"> · </i>}<a href={`#solucao-${item.id}`}>{item.title}</a></span>)}
          </dd></div>
          <div className="title-cell title-cell-method"><dt>Método</dt><dd>{process.map(step => step.title).join(' → ')}</dd></div>
          <div className="title-cell title-cell-contact"><dt>Contato</dt><dd><a href={site.contact.whatsapp} target="_blank" rel="noopener noreferrer">{site.contact.display}<span className="sr-only"> pelo WhatsApp (abre em uma nova aba)</span></a></dd></div>
          <div className="title-cell title-cell-sheet"><dt>Folha</dt><dd>01 / 06</dd></div>
        </dl>
        <ol className="title-block-index" aria-hidden="true" data-title-index>
          {['Semente', 'Abertura', 'Ponto de encontro', 'Hub'].map((label, i) => <li key={label} data-index={i}><span>{String(i + 1).padStart(2, '0')}</span>{label}</li>)}
        </ol>
      </div>

      <ol className="story-chapters" aria-label="O conceito da marca">
        {concept.map((item, index) => <li key={item.number} className="story-chapter" data-chapter={index}>
          <ConceptFigure state={index} />
          <p className="story-chapter-count" aria-hidden="true">{item.number}</p>
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
