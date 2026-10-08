import { manifesto, values } from '@/data/site';

// 05 — The official manifesto (manual p.10), set in the brand's wide-tracked signature
// typography (manual p.11) on sand.
export function Manifesto() {
  return <section id="manifesto" className="manifesto surface-sand" aria-labelledby="manifesto-title">
    <div className="shell manifesto-grid">
      <p className="label" data-reveal><span className="label-index">05</span>Manifesto</p>
      <p className="signature-type" aria-label="Conectando ideias. Construindo soluções." data-reveal="lines">
        <span className="line"><span>Conectando</span></span>
        <span className="line"><span><b>ideias</b></span></span>
        <span className="line"><span>Construindo</span></span>
        <span className="line"><span><b>soluções</b></span></span>
      </p>
      <div className="manifesto-body">
        <h2 id="manifesto-title" data-reveal>{manifesto.opening}</h2>
        {manifesto.paragraphs.map(text => <p key={text} data-reveal>{text}</p>)}
      </div>
      <div className="values" data-reveal="rules">
        <p className="values-label">Valores</p>
        <ul aria-label="Valores da Connections Hub">
          {values.map((value, i) => <li key={value}><span>{String(i + 1).padStart(2, '0')}</span>{value}</li>)}
        </ul>
      </div>
    </div>
  </section>;
}
