import { Arrow } from '@/components/arrow';
import { Schematic } from '@/components/schematic';
import { SectionHead } from '@/components/section-head';
import { solutions } from '@/data/site';

/*
  03 — Services. Each one says what it is, what problem it solves and what a project can
  include, beside a technical figure of what is built. On wide screens one sticky plate
  follows the service being read; on narrow screens each service carries its own figure.
*/
export function Solutions() {
  return <section id="solucoes" className="solutions surface-deep" data-nav-theme="dark" aria-labelledby="solutions-title">
    <div className="shell">
      <SectionHead index="03" label="Soluções" id="solutions-title" lines={['Do problema', 'à solução.']}
        intro="Quatro frentes de trabalho, definidas com você a partir do que a operação precisa. Um mesmo projeto pode combinar mais de uma." />
      <div className="solutions-body">
        <div className="solutions-visual" aria-hidden="true">
          <div className="solutions-plate">
            {solutions.map(item => <figure className="solutions-sheet" key={item.id} data-id={item.id}>
              <header className="plate-head"><span>Fig. 03.{Number(item.number)}</span><span>{item.figure.title}</span></header>
              <Schematic id={item.id} />
              <figcaption className="plate-caption">{item.figure.caption}</figcaption>
            </figure>)}
          </div>
        </div>
        <ol className="solutions-list" data-spy>
          {solutions.map(item => <li key={item.id} id={`solucao-${item.id}`} className="solution" data-id={item.id}>
            <article aria-labelledby={`solucao-${item.id}-title`}>
              <header className="solution-head">
                <p className="solution-number">{item.number}</p>
                <h3 id={`solucao-${item.id}-title`}>{item.title}</h3>
              </header>
              <p className="solution-summary">{item.summary}</p>
              <figure className="solution-figure">
                <Schematic id={item.id} className="schematic-inline" />
                <figcaption><span>Fig. 03.{Number(item.number)} · {item.figure.title}</span>{item.figure.caption}</figcaption>
              </figure>
              <dl className="solution-spec">
                <div><dt>Resolve</dt><dd>{item.solves}</dd></div>
                <div><dt>Pode incluir</dt><dd><ol>{item.includes.map((entry, i) => <li key={entry}><span>{String(i + 1).padStart(2, '0')}</span>{entry}</li>)}</ol></dd></div>
              </dl>
              <a className="text-link" href="#contato">Conversar sobre {item.title.toLowerCase()}<Arrow /></a>
            </article>
          </li>)}
        </ol>
      </div>
    </div>
  </section>;
}
