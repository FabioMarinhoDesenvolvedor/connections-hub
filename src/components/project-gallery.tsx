import { projects } from '@/data/projects';
import type { Dictionary } from '@/i18n';
import { Arrow } from './arrow';

// A server-rendered editorial gallery; no empty-state copy reaches the website.
export function ProjectGallery({ t }: { t: Dictionary }) {
  if (!projects.length) return null;
  return <section className="projects" aria-labelledby="projects-title">
    <div className="shell">
      <p className="eyebrow">{t.projects.label}</p>
      <h2 id="projects-title">{t.projects.title}</h2>
      <div className="project-gallery">
        {projects.map(project => <article className="project" key={project.slug}>
          <figure className="project-media">
            <img {...project.image} loading="lazy" decoding="async" />
          </figure>
          <div className="project-info">
            <div><p className="eyebrow">{project.category}</p><h3>{project.title}</h3></div>
            <div><p>{project.summary}</p>
              <ul aria-label={t.projects.delivered}>{project.delivered.map(item => <li key={item}>{item}</li>)}</ul>
              {project.outcome && <p>{project.outcome}</p>}
              {project.href && <a className="project-link" href={project.href} target="_blank" rel="noopener noreferrer">{t.projects.visit}<Arrow /><span className="sr-only"> {t.ui.newTab}</span></a>}
            </div>
          </div>
        </article>)}
      </div>
    </div>
  </section>;
}
