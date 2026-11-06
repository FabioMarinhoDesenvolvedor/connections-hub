import { Arrow } from '@/components/arrow';
import { SectionHead } from '@/components/section-head';
import { SolutionInline, SolutionsPlate } from '@/components/solutions/stage';
import { solutionIds } from '@/data/site';
import type { Dictionary } from '@/i18n';

/*
  03 — Services. Each one says what it is, what problem it solves and what a project can
  include. Beside it, a short scene (components/solutions/stage.tsx) plays the problem a
  company lives with and then what we build to solve it. On wide screens one sticky window
  follows the service being read; on narrow screens each service carries its own.
*/
export function Solutions({ t }: { t: Dictionary['solutions'] }) {
  return <section id="solucoes" className="solutions surface-deep" data-nav-theme="dark" aria-labelledby="solutions-title">
    <div className="shell">
      <SectionHead label={t.label} id="solutions-title" lines={t.title} intro={t.intro} />
      <div className="solutions-body">
        <div className="solutions-visual">
          <SolutionsPlate t={t} />
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
                <SolutionInline id={id} t={t} />
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
