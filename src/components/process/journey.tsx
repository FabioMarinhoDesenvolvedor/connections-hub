'use client';

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { Dictionary } from '@/i18n';

/*
  The process as a journey: one example project (the vet clinic of the Solutions scenes) told
  through the four steps, each with what the client receives.
  - 01 Understand: the first conversation; what was heard becomes notes, then a diagnosis.
  - 02 Plan: priorities, stages on a timeline, and the decision explained in plain words.
  - 03 Build: the screen grows from a sketch to v1.0, and the client's comment is answered.
  - 04 Launch: live; the schedule fills, the team is ready and support answers.

  Big tabs with progress bars advance on their own while the section is in view; choosing a
  step (click, arrows, previous/next) takes over. Scenes reuse the Solutions scene canvas
  (.sx, sized in em from the window's width); their resting styles are the last frame.
*/
type T = Dictionary['process'];
const STEP_MS = 8500;
const at = (d: number, extra?: CSSProperties) => ({ '--d': `${d}s`, ...extra } as CSSProperties);
const Icon = ({ d, size = '1.15em' }: { d: string; size?: string }) => <svg viewBox="0 0 20 20" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const CHECK = 'm4.5 10.5 3.5 3.5 7.5-8';
const BELL = 'M5.5 13.5V9a4.5 4.5 0 0 1 9 0v4.5l1.5 1.5h-12zM8.5 17h3';
const DOC = 'M5.5 2.8h6.5l3.5 3.5V17a.5.5 0 0 1-.5.5h-9.5a.5.5 0 0 1-.5-.5V3.3a.5.5 0 0 1 .5-.5zM12 2.8v3.5h3.5M7.5 10h5M7.5 13h5';

function Understand({ s }: { s: T['journey']['understand'] }) {
  return <div className="pj-understand">
    <div className="sx-card pj-call a-pop" style={at(0)}>
      <p className="pj-call-head"><i className="pj-live" />{s.call}</p>
      <div className="pj-people"><span className="pj-avatar pj-avatar-you">{s.you[0]}</span><span className="pj-avatar pj-avatar-us"><i className="sx-logo" /></span></div>
      <p className="sx-msg sx-msg-in a-up" style={at(.5)}><small>{s.you}</small>{s.said[0]}</p>
      <p className="sx-msg sx-msg-out a-up" style={at(1.3)}><small>{s.us}</small>{s.said[1]}</p>
    </div>
    <div className="pj-board">
      <p className="pj-board-title a-up" style={at(1.8)}>{s.board}</p>
      <div className="pj-notes">{s.notes.map((note, i) => <span key={note} className={`pj-note pj-note-${i} a-drop`} style={at(2 + i * .3)}>{note}</span>)}</div>
      <div className="sx-app pj-doc a-pop" style={at(3.1)}>
        <p className="pj-doc-head"><Icon d={DOC} />{s.doc}</p>
        <ul>{s.docLines.map((line, i) => <li key={line} className="a-up" style={at(3.4 + i * .2)}><Icon d={CHECK} size="1em" />{line}<span /></li>)}</ul>
      </div>
    </div>
  </div>;
}

function Plan({ s }: { s: T['journey']['plan'] }) {
  return <div className="sx-app pj-plan a-pop" style={at(0)}>
    <div className="pj-plan-body">
      <div className="pj-priorities">
        <b className="pj-app-title">{s.title}</b>
        <ul>{s.items.map((item, i) => <li key={item} className="a-up" style={at(.4 + i * .25)}>
          <span>{item}</span><i className={i < 2 ? 'pj-must' : 'pj-later'}>{i < 2 ? s.must : s.later}</i>
        </li>)}</ul>
      </div>
      <div className="pj-timeline">
        <small>{s.timeline}</small>
        {s.phases.map((phase, i) => <div key={phase} className="pj-phase" style={{ '--from': [0, 36, 60][i], '--span': [36, 24, 40][i] } as CSSProperties}>
          <span className="pj-phase-bar a-grow" style={at(1.3 + i * .35)}>{phase}</span>
        </div>)}
        <div className="pj-weeks"><span>1</span><span>2</span><span>3</span><span>4</span></div>
      </div>
    </div>
    <p className="pj-why a-pop" style={at(2.7)}><span className="point" />{s.why}</p>
  </div>;
}

function Build({ s }: { s: T['journey']['build'] }) {
  return <div className="pj-build">
    <ol className="pj-versions">{s.versions.map((v, i) => <li key={v} className={`pj-v pj-v-${i}`}><i />{v}</li>)}</ol>
    <div className="sx-app pj-screen a-pop" style={at(0)}>
      <div className="sx-bar"><span className="sx-dots"><i /><i /><i /></span></div>
      <div className="pj-screen-body">
        <div className="pj-wires" aria-hidden="true"><span /><span /><span /><span /></div>
        <div className="pj-real">
          <b>{s.title}</b>
          {s.slots.map((slot, i) => <span key={slot} className="pj-slot"><i />{slot}<em className={i === 0 ? 'pj-phone' : ''}>{i === 0 ? '(11) 9····-4321' : ''}</em></span>)}
        </div>
      </div>
    </div>
    <div className="pj-comment">
      <p className="sx-msg sx-msg-out a-up" style={at(1.4)}>{s.comment}</p>
      <span className="sx-tag sx-tag-good a-pop" style={at(3.2)}><Icon d={CHECK} />{s.done}</span>
    </div>
  </div>;
}

function Launch({ s }: { s: T['journey']['launch'] }) {
  return <div className="pj-launch">
    <div className="sx-app pj-agenda a-pop" style={at(0)}>
      <div className="pj-agenda-head"><b>{s.agenda}</b><span className="pj-onair"><i />{s.live}</span></div>
      <ul>{s.bookings.map((b, i) => <li key={b} className="a-up" style={at(.6 + i * .45)}><i />{b}</li>)}</ul>
    </div>
    <div className="pj-side">
      {s.checks.map((c, i) => <span key={c} className="sx-tag sx-tag-good a-pop" style={at(2.4 + i * .3)}><Icon d={CHECK} />{c}</span>)}
      <div className="sx-card pj-support">
        <p className="sx-msg sx-msg-in a-up" style={at(3)}>{s.ask}</p>
        <p className="sx-msg sx-msg-out a-up" style={at(3.7)}>{s.answer}</p>
      </div>
    </div>
  </div>;
}

export function Journey({ t }: { t: T }) {
  const j = t.journey;
  const root = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  const [auto, setAuto] = useState(true);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const steps = t.steps;

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const el = root.current;
    if (!el) return;
    const view = new IntersectionObserver(([entry]) => setVisible(entry.intersectionRatio >= 0.35), { threshold: [0, 0.35] });
    view.observe(el);
    return () => view.disconnect();
  }, []);

  // While it plays on its own, each step stays STEP_MS, then the next one comes in (the last stays).
  const playing = auto && visible && !reduced && step < steps.length - 1;
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => { setStep(s => s + 1); setRun(r => r + 1); }, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing, step]);

  const go = (index: number, focus = false) => {
    const next = Math.max(0, Math.min(steps.length - 1, index));
    setAuto(false);
    setStep(next);
    setRun(r => r + 1);
    if (focus) tabs.current[next]?.focus();
  };
  const onKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const move: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (event.key in move) { event.preventDefault(); go((step + move[event.key] + steps.length) % steps.length, true); }
    else if (event.key === 'Home') { event.preventDefault(); go(0, true); }
    else if (event.key === 'End') { event.preventDefault(); go(steps.length - 1, true); }
  };

  const current = steps[step];
  const number = (i: number) => String(i + 1).padStart(2, '0');
  const scene = [<Understand key="u" s={j.understand} />, <Plan key="p" s={j.plan} />, <Build key="b" s={j.build} />, <Launch key="l" s={j.launch} />][step];

  return <div ref={root} className="journey" data-step={step} data-playing={playing || undefined}>
    <div className="journey-tabs" role="tablist" aria-label={j.label}>
      {steps.map((item, i) => <button key={item.title} ref={el => { tabs.current[i] = el; }} type="button" role="tab" id={`etapa-${i}`}
        aria-selected={step === i} aria-controls="etapa-painel" tabIndex={step === i ? 0 : -1}
        className="journey-tab" data-done={i < step || undefined} onClick={() => go(i)} onKeyDown={onKey}>
        <span className="journey-tab-number">{number(i)}</span>
        <span className="journey-tab-title">{item.title}</span>
        <span className="journey-tab-bar" aria-hidden="true"><i key={step === i ? `${run}` : 'idle'} style={{ animationDuration: `${STEP_MS}ms` }} /></span>
      </button>)}
    </div>

    <div className="journey-body" id="etapa-painel" role="tabpanel" aria-labelledby={`etapa-${step}`}>
      <div className="journey-copy" key={`copy-${step}`}>
        <p className="journey-number">{number(step)}<span>/ 0{steps.length}</span></p>
        <h3>{current.title}</h3>
        <p className="journey-text">{current.text}</p>
        <p className="journey-outcome"><span>{t.outcomeLabel}</span>{current.outcome}</p>
        <div className="journey-nav">
          <button type="button" className="journey-arrow" onClick={() => go(step - 1)} disabled={step === 0} aria-label={j.prev}><Icon d="M12.5 4.5 7 10l5.5 5.5" size="18" /></button>
          <button type="button" className="journey-arrow" onClick={() => go(step + 1)} disabled={step === steps.length - 1} aria-label={j.next}><Icon d="M7.5 4.5 13 10l-5.5 5.5" size="18" /></button>
          <span className="journey-dots" aria-hidden="true">{steps.map((_, i) => <i key={i} data-on={i === step || undefined} />)}</span>
        </div>
      </div>
      <div className="journey-window">
        <div className="journey-scene" aria-hidden="true">
          <div key={`${step}-${run}`} className="sx pj">
            {scene}
            <div className="sx-toast pj-toast a-toast" style={at(step === 0 ? 4.1 : step === 1 ? 3.3 : step === 2 ? 3.6 : 4.4)}>
              <span className="sx-toast-icon"><Icon d={step === 3 ? CHECK : BELL} /></span>
              <div><b>{j.toasts[step]}</b></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>;
}
