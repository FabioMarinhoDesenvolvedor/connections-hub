import type { CSSProperties } from 'react';
import { SectionHead } from '@/components/section-head';
import type { Dictionary } from '@/i18n';

const RADIUS = 150;
// The brand's two-tone ring ("bolinha"): a navy arc grows over a mist track as you read,
// and the meeting point travels at its head. Quarter notches mark the four steps.
function Dial() {
  return <svg className="dial" viewBox="0 0 400 400" aria-hidden="true">
    <circle className="dial-track" cx="200" cy="200" r={RADIUS} pathLength={4} transform="rotate(-90 200 200)" />
    <circle className="dial-arc" cx="200" cy="200" r={RADIUS} pathLength={1} transform="rotate(-90 200 200)" />
    <g className="dial-head"><circle cx="200" cy={200 - RADIUS} r="13" /></g>
  </svg>;
}

// 04 — Process. Names verbatim from the brand; each step states what the client receives.
export function Process({ t }: { t: Dictionary['process'] }) {
  const steps = t.steps.map((step, i) => ({ ...step, number: String(i + 1).padStart(2, '0') }));
  return <section id="processo" className="process" aria-labelledby="process-title">
    <div className="shell">
      <SectionHead label={t.label} id="process-title" lines={t.title} intro={t.intro} />
      <div className="process-body" data-progress data-start="0.55" data-end="0.45">
        <div className="process-visual">
          <div className="process-dial">
            <Dial />
            <div className="dial-centre" aria-hidden="true">
              {steps.map(step => <p key={step.number} data-step={step.number}><span>{step.number}</span>{step.title}</p>)}
            </div>
          </div>
        </div>
        <ol className="process-steps" data-spy>
          {steps.map((step, i) => <li key={step.number} className="step" data-step={step.number} style={{ '--i': i } as CSSProperties} data-progress data-start="0.85" data-end="0.5">
            <svg className="step-dial" viewBox="0 0 48 48" aria-hidden="true">
              <circle cx="24" cy="24" r="18" className="step-dial-track" />
              <circle cx="24" cy="24" r="18" className="step-dial-arc" pathLength={4} strokeDasharray={`${i + 1} 4`} transform="rotate(-90 24 24)" />
              {/* Phones: the ring fills from this step's quarter to the next as the step is read. */}
              <g className="step-dial-head"><circle cx="24" cy="6" r="3.4" /></g>
            </svg>
            <p className="step-number">{step.number}</p>
            <h3>{step.title}</h3>
            <p className="step-text">{step.text}</p>
            <p className="step-outcome"><span>{t.outcomeLabel}</span>{step.outcome}</p>
          </li>)}
        </ol>
      </div>
    </div>
  </section>;
}
