import { projects } from '@/data/projects';
import { Arrow } from './arrow';

// A server-rendered editorial gallery; no empty-state copy reaches the website.
export function ProjectGallery() {
  if (!projects.length) return null;
  return <section className="projects" aria-labelledby="projects-title">
    <div className="shell">
      <p className="eyebrow">Projetos</p>
      <h2 id="projects-title">O que construímos.</h2>
      <div className="project-gallery">
        {projects.map(project => <article className="project" key={project.slug}>
          <figure className="project-media">
            <img {...project.image} loading="lazy" decoding="async" />
          </figure>
          <div className="project-info">
            <div><p className="eyebrow">{project.category}</p><h3>{project.title}</h3></div>
            <div><p>{project.summary}</p>
              <ul aria-label="Entregas do projeto">{project.delivered.map(item => <li key={item}>{item}</li>)}</ul>
              {project.outcome && <p>{project.outcome}</p>}
              {project.href && <a className="project-link" href={project.href} target="_blank" rel="noopener noreferrer">Visitar projeto<Arrow /><span className="sr-only"> (abre em nova aba)</span></a>}
            </div>
          </div>
        </article>)}
      </div>
    </div>
  </section>;
}
