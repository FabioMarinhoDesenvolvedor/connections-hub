import { Arrow } from '@/components/arrow';
import { Schematic } from '@/components/schematic';
import { SectionHead } from '@/components/section-head';
import { solutionIds } from '@/data/site';
import type { Dictionary } from '@/i18n';

/*
  03 — Services. Each one says what it is, what problem it solves and what a project can
  include, beside a technical figure of what is built. On wide screens one sticky plate
  follows the service being read; on narrow screens each service carries its own figure.
*/
export function Solutions({ t }: { t: Dictionary['solutions'] }) {
  const figure = (index: number) => `${t.figure} 03.${index + 1}`;
  return <section id="solucoes" className="solutions surface-deep" data-nav-theme="dark" aria-labelledby="solutions-title">
    <div className="shell">
      <SectionHead label={t.label} id="solutions-title" lines={t.title} intro={t.intro} />
      <div className="solutions-body">
        <div className="solutions-visual" aria-hidden="true">
          <div className="solutions-plate">
            {solutionIds.map((id, index) => <figure className="solutions-sheet" key={id} data-id={id}>
              <header className="plate-head"><span>{figure(index)}</span><span>{t.items[id].figure.title}</span></header>
              <Schematic id={id} labels={t.schematic} />
              <figcaption className="plate-caption">{t.items[id].figure.caption}</figcaption>
            </figure>)}
          </div>
        </div>
        <ol className="solutions-list" data-spy>
          {solutionIds.map((id, index) => {
            const item = t.items[id];
            return <li key={id} id={`solucao-${id}`} className="solution" data-id={id}>
              <article aria-labelledby={`solucao-${id}-title`}>
                <header className="solution-head">
                  <p className="solution-number">{String(index + 1).padStart(2, '0')}</p>
                  <h3 id={`solucao-${id}-title`}>{item.title}</h3>
                </header>
                <p className="solution-summary">{item.summary}</p>
                <figure className="solution-figure">
                  <Schematic id={id} labels={t.schematic} className="schematic-inline" drawOnView />
                  <figcaption><span>{figure(index)} · {item.figure.title}</span>{item.figure.caption}</figcaption>
                </figure>
                <dl className="solution-spec">
                  <div><dt>{t.solvesLabel}</dt><dd>{item.solves}</dd></div>
                  <div><dt>{t.includesLabel}</dt><dd><ol>{item.includes.map((entry, i) => <li key={entry}><span>{String(i + 1).padStart(2, '0')}</span>{entry}</li>)}</ol></dd></div>
                </dl>
                <a className="text-link" href="#contato">{item.cta}<Arrow /></a>
              </article>
            </li>;
          })}
        </ol>
      </div>
    </div>
  </section>;
}
