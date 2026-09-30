import { Arrow } from '@/components/arrow';
import { BrandImage } from '@/components/brand-image';
import { ConceptStage } from '@/components/concept-stage';
import { RevealText } from '@/components/reveal-text';
import { concept, manifesto, process as processSteps, site, solutions, values } from '@/data/site';

export default function Home() {
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  return <main id="conteudo">
    {origin && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: site.name, url: origin, logo: `${origin}/brand/logo.svg`, description: site.description, email: site.contact.email, telephone: site.contact.telephone }).replace(/</g, '\\u003c') }} />}

    {/* 01 — Hero + Conceito. One pinned stage, text scrolls natively over it. */}
    <section id="inicio" className="story" data-story aria-labelledby="hero-title">
      <div className="story-sticky">
        <ConceptStage />
        {/* The official file, revealed only by clipping: the symbol, then each line of the name rising from its baseline. */}
        <div className="story-lockup" aria-hidden="true">
          <img className="lockup-symbol" src="/brand/logo.svg" width="1408" height="311" alt="" />
          <div className="lockup-line lockup-line-1"><img src="/brand/logo.svg" width="1408" height="311" alt="" /></div>
          <div className="lockup-line lockup-line-2"><img src="/brand/logo.svg" width="1408" height="311" alt="" /></div>
        </div>
        <p className="final-copy">A Connections Hub é o ponto central que reúne clientes aos melhores serviços.</p>
      </div>
      <div className="story-chapters">
        <header className="chapter chapter-hero shell">
          <div className="hero-copy">
            <p className="eyebrow"><span className="signal" />Pessoas. Ideias. Tecnologia.</p>
            <h1 id="hero-title">Conectando ideias.<span>Construindo soluções.</span></h1>
            <p className="hero-lead">O ponto de encontro para empresas e pessoas que precisam transformar uma necessidade em uma solução tecnológica.</p>
            <div className="actions">
              <a className="button button-primary" href="#contato">Vamos conversar<Arrow diagonal /></a>
              <a className="button button-ghost" href="#solucoes">Conheça as soluções</a>
            </div>
          </div>
          <a className="scroll-cue" href="#conceito"><span className="scroll-cue-line" aria-hidden="true" />Role para conhecer o conceito</a>
        </header>
        {concept.map((item, index) => <div key={item.number} id={index === 0 ? 'conceito' : undefined} className="chapter chapter-concept shell" data-progress data-start="1" data-end="0">
          <div className="chapter-copy">
            <p className="chapter-count"><span>{item.number}</span><i aria-hidden="true" />03</p>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </div>
        </div>)}
        {/* Scroll room for the finale: the hub assembles on the pinned stage above. */}
        <div className="chapter-final" aria-hidden="true" />
      </div>
    </section>

    {/* 02 — Sobre */}
    <section id="sobre" className="about" aria-labelledby="about-title">
      <div className="shell about-grid">
        <p className="eyebrow chapter-label" data-reveal>Sobre a Connections Hub</p>
        <RevealText as="h2" id="about-title" className="about-title" text="Tecnologia só faz sentido quando resolve alguma coisa." />
        <div className="about-body" data-reveal>
          <p>Sites, sistemas, dashboards, e-commerces e outras soluções digitais fazem parte desse ecossistema. Mas o que realmente nos move é conectar: conhecimento, pessoas, parceiros e tecnologia às necessidades reais de cada projeto.</p>
          <p className="about-emphasis">Uma boa solução não precisa ser complicada. Ela precisa fazer sentido.</p>
        </div>
      </div>
    </section>

    {/* 03 — Product moment: the image opens as it enters. */}
    <section className="moment" aria-label="A identidade Connections Hub aplicada ao ambiente de trabalho" data-progress data-start="1" data-end="0.7">
      <figure className="moment-frame">
        <BrandImage name="brand-office" alt="Mockup institucional: ambiente de trabalho contemporâneo com a identidade Connections Hub aplicada nas paredes." />
        <figcaption className="shell"><span>Conhecimento como pilar central de um atendimento personalizado.</span><small>Aplicação da identidade · mockup</small></figcaption>
      </figure>
    </section>

    {/* 04 — Soluções: navy surface, typographic list, one active row at a time. */}
    <section id="solucoes" className="solutions" data-nav-theme="dark" aria-labelledby="solutions-title">
      <div className="shell">
        <div className="solutions-head">
          <p className="eyebrow chapter-label" data-reveal>Soluções</p>
          <h2 id="solutions-title" data-reveal>Soluções para o que você precisa.<span>Do problema à solução.</span></h2>
          <p className="solutions-intro" data-reveal>Nem todo negócio precisa da mesma tecnologia. Por isso, desenvolvemos de acordo com a necessidade de cada projeto.</p>
        </div>
        <div className="solutions-layout">
          <figure className="solutions-visual" data-reveal>
            <BrandImage name="brand-technology" alt="Mockup institucional: pessoa segurando um tablet com o ícone oficial da Connections Hub na tela." />
          </figure>
          <ol className="solution-list" data-spy>
            {solutions.map(item => <li key={item.number} className="solution">
              <span className="solution-number">{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <a href="#contato" className="solution-link">Conversar sobre {item.title.toLowerCase()}<Arrow diagonal /></a>
            </li>)}
          </ol>
        </div>
        <p className="solutions-foot" data-reveal>Personalizadas de acordo com o que faz a diferença para você.</p>
      </div>
    </section>

    {/* 05 — Processo: the track fills with scroll; the orange point marks where you are. */}
    <section id="processo" className="process" aria-labelledby="process-title">
      <div className="shell">
        <div className="process-head">
          <p className="eyebrow chapter-label" data-reveal>Processo</p>
          <h2 id="process-title" data-reveal>Aqui, o processo faz com que a entrega seja <span>excelente.</span></h2>
          <p className="process-lead" data-reveal>Do planejamento à implantação, trabalhamos para que a tecnologia se adapte ao negócio, e não o contrário.</p>
        </div>
        <ol className="process-track" data-progress data-start="0.8" data-end="0.55" style={{ '--steps': processSteps.length } as React.CSSProperties}>
          <li className="process-rail" aria-hidden="true"><span /></li>
          {processSteps.map((step, index) => <li key={step.number} className="step" style={{ '--i': index } as React.CSSProperties}>
            <span className="step-node" aria-hidden="true" />
            <span className="step-number">{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>)}
        </ol>
      </div>
    </section>

    {/* 06 — Manifesto (manual p.10, verbatim). */}
    <section id="manifesto" className="manifesto" aria-labelledby="manifesto-title">
      <div className="shell">
        <p className="eyebrow chapter-label" id="manifesto-title" data-reveal>Manifesto</p>
        <RevealText className="manifesto-opening" text={manifesto.opening} start={0.9} end={0.45} />
        <div className="manifesto-grid">
          <p data-reveal>{manifesto.belief}</p>
          <ul className="values" aria-label="Valores da Connections Hub" data-reveal>
            {values.map(value => <li key={value}>{value}</li>)}
          </ul>
        </div>
      </div>
    </section>

    <section className="people" data-nav-theme="dark" aria-labelledby="people-title">
      <figure className="people-frame" data-progress data-start="1" data-end="0">
        <BrandImage name="brand-people" alt="Mockup institucional: duas pessoas conversando em um escritório, com uniformes Connections Hub." />
      </figure>
      <div className="people-copy shell">
        <div data-reveal>
          <h2 id="people-title">Somos feitos de conexões.</h2>
          <p>Conectamos pessoas, ideias, experiências e possibilidades para transformar encontros em movimento e movimento em crescimento.</p>
          <p className="people-lines">{manifesto.closing.map(line => <span key={line}>{line}</span>)}</p>
        </div>
      </div>
      <p className="people-note shell">Aplicação da identidade · mockup</p>
    </section>

    {/* 07 — Contato */}
    <section id="contato" className="contact" aria-labelledby="contact-title">
      <img className="contact-ring" src="/brand/ring-orange.svg" width="312" height="312" alt="" aria-hidden="true" loading="lazy" />
      <div className="shell contact-inner">
        <p className="eyebrow chapter-label" data-reveal><span className="signal" />O próximo ponto de encontro</p>
        <h2 id="contact-title" data-reveal>Tem uma necessidade?<span>Vamos encontrar a solução.</span></h2>
        <p className="contact-lead" data-reveal>Tem um projeto, uma ideia ou um problema para resolver? Fale com a Connections Hub.</p>
        <div className="actions" data-reveal>
          <a className="button button-primary button-large" href={site.contact.href} target="_blank" rel="noopener noreferrer">{site.contact.label}<Arrow diagonal /><span className="sr-only"> pelo WhatsApp (abre em uma nova aba)</span></a>
          <a className="button button-ghost button-large" href={`mailto:${site.contact.email}`}>Enviar um e-mail</a>
        </div>
        <dl className="contact-channels" data-reveal>
          <div><dt>WhatsApp</dt><dd><a href={`tel:${site.contact.telephone}`}>{site.contact.display}</a></dd></div>
          <div><dt>E-mail</dt><dd><a href={`mailto:${site.contact.email}`}>{site.contact.email}</a></dd></div>
        </dl>
      </div>
    </section>
  </main>;
}
