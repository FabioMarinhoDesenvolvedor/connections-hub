import type { Dictionary } from '@/i18n';

// 05 — The official manifesto (manual p.10), set in the brand's wide-tracked signature
// typography (manual p.11) on sand.
export function Manifesto({ t }: { t: Dictionary['manifesto'] }) {
  return <section id="manifesto" className="manifesto surface-sand" aria-labelledby="manifesto-title">
    <div className="shell manifesto-grid">
      <p className="label" data-reveal>{t.label}</p>
      <p className="signature-type" aria-label={t.signatureAria} data-reveal="lines">
        {t.signature.map(part => <span className="line" key={part.text}><span>{part.bold ? <b>{part.text}</b> : part.text}</span></span>)}
      </p>
      <div className="manifesto-body">
        <h2 id="manifesto-title" data-reveal>{t.opening}</h2>
        {t.paragraphs.map(text => <p key={text} data-progress data-start="0.82" data-end="0.5">{text}</p>)}
      </div>
      <div className="values" data-reveal="rules">
        <p className="values-label">{t.valuesLabel}</p>
        <ul aria-label={t.valuesAria}>
          {t.values.map(value => <li key={value}>{value}</li>)}
        </ul>
      </div>
    </div>
  </section>;
}
