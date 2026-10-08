import type { CSSProperties } from 'react';
import { SectionHead } from '@/components/section-head';
import { process } from '@/data/site';

const RADIUS = 150;
// The brand's two-tone ring ("bolinha"): a navy arc grows over a mist track as you read,
// and the meeting point travels at its head. Quarter notches mark the four steps.
function Dial() {
  return <svg className="dial" viewBox="0 0 400 400" aria-hidden="true">
    <circle className="dial-track" cx="200" cy="200" r={RADIUS} pathLength={4} transform="rotate(-90 200 200)" />
    <circle className="dial-arc" cx="200" cy="200" r={RADIUS} pathLength={1} transform="rotate(-90 200 200)" />
    {process.map((step, i) => {
      const angle = (i / process.length) * Math.PI * 2 - Math.PI / 2;
      const x = 200 + Math.cos(angle) * (RADIUS + 48);
      const y = 200 + Math.sin(angle) * (RADIUS + 48);
      return <text key={step.number} className="dial-index" x={x} y={y} textAnchor="middle" dominantBaseline="central">{step.number}</text>;
    })}
    <g className="dial-head"><circle cx="200" cy={200 - RADIUS} r="13" /></g>
  </svg>;
}

// 04 — Process. Names verbatim from the brand; each step states what the client receives.
export function Process() {
  return <section id="processo" className="process" aria-labelledby="process-title">
    <div className="shell">
      <SectionHead index="04" label="Processo" id="process-title" lines={['Quatro etapas.', 'Você acompanha todas.']}
        intro="O processo existe para que nada seja decidido sem você entender o porquê, e para que a entrega chegue como combinado." />
      <div className="process-body" data-progress data-start="0.55" data-end="0.45">
        <div className="process-visual">
          <div className="process-dial">
            <Dial />
            <div className="dial-centre" aria-hidden="true">
              {process.map(step => <p key={step.number} data-step={step.number}><span>{step.number}</span>{step.title}</p>)}
            </div>
          </div>
        </div>
        <ol className="process-steps" data-spy>
          {process.map((step, i) => <li key={step.number} className="step" data-step={step.number} style={{ '--i': i } as CSSProperties}>
            <svg className="step-dial" viewBox="0 0 48 48" aria-hidden="true">
              <circle cx="24" cy="24" r="18" className="step-dial-track" />
              <circle cx="24" cy="24" r="18" className="step-dial-arc" pathLength={4} strokeDasharray={`${i + 1} 4`} transform="rotate(-90 24 24)" />
            </svg>
            <p className="step-number">{step.number}</p>
            <h3>{step.title}</h3>
            <p className="step-text">{step.text}</p>
            <p className="step-outcome"><span>Você recebe</span>{step.outcome}</p>
          </li>)}
        </ol>
      </div>
    </div>
  </section>;
}
