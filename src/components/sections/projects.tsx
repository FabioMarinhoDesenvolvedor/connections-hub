import { GithubMark } from '@/components/github-mark';
import { ProjectExplorer, type ExplorerItem } from '@/components/projects/explorer';
import { SectionHead } from '@/components/section-head';
import { github, projects } from '@/data/projects';
import { getDictionary, type Dictionary, type Locale } from '@/i18n';

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));

/*
  04 — Projects, opened up. Each project is taken apart into the stack it was built on,
  with its interface live on top (src/components/projects). Facts come from the
  repositories (src/data/projects.ts); no usage numbers are published because none were
  measured.
*/
export function Projects({ t, ui, locale, lang }: { t: Dictionary['projects']; ui: Dictionary['ui']; locale: string; lang: Locale }) {
  const month = new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const items: ExplorerItem[] = projects.map(project => ({
    project,
    client: project.client ?? t.own,
    status: project.status,
    statusLabel: t.status[project.status],
    history: [
      project.since && fill(t.since, { date: month.format(new Date(`${project.since}-01T12:00:00Z`)) }),
      project.version && fill(t.version, { v: project.version }),
    ].filter(Boolean).join(' · '),
    copy: t.items[project.id],
  }));
  // The site's own miniature speaks the three languages it is built in.
  const hero = Object.fromEntries((['pt', 'en', 'ja'] as const).map(l => [l, getDictionary(l).hero])) as Record<'pt' | 'en' | 'ja', Dictionary['hero']>;
  return <section id="projetos" className="projects" aria-labelledby="projects-title">
    <div className="shell">
      <SectionHead label={t.label} id="projects-title" lines={t.title} intro={t.intro} />
      <a className="projects-github" href={github} target="_blank" rel="noopener noreferrer">
        <GithubMark />{t.github}<span className="sr-only"> {ui.newTab}</span>
      </a>
      <ProjectExplorer items={items} hero={hero} locale={lang} t={{
        tabs: t.tabs, layers: t.layers, facts: t.facts, hint: t.hint, tryLabel: t.tryLabel, front: t.front, back: t.back,
        reset: t.reset, trace: t.trace, traceIdle: t.traceIdle, more: t.more, stackLabel: t.stackLabel,
        repo: t.repo, privateRepo: t.privateRepo, newTab: ui.newTab,
        roles: t.roles, routes: t.routes, columns: t.columns, response: t.response, clickNode: t.clickNode,
        play: t.play, inspect: t.inspect,
      }} />
      <p className="xp-note">{t.note}</p>
    </div>
  </section>;
}
