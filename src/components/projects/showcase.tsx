'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { ProjectId } from '@/data/projects';
import { ConnectionsMini, type HeroCopy } from './minis/connections';
import { MarketingMini } from './minis/marketing';
import { TasksMini } from './minis/tasks';
import { WorkhubMini } from './minis/workhub';
import { WsnMini } from './minis/wsn';
import { ProjectExplorer, type ExplorerCopy, type ExplorerItem } from './explorer';

/*
  The projects as a cinematic showcase, in glass. On wide screens the section holds a stage on
  screen while it is scrolled through: each project takes the stage in turn, its name huge
  behind frosted glass, lit by its own product's colours. A large glass screen carries the live
  interface (it works; every action says in one sentence what it did) and a glass phone beside
  it carries the story: who it is for, the challenge, what was built, what just happened.
  Scrolling moves the camera from one project to the next; the dots jump straight to one.
  "Watch it work" drives the interface with the brand's ring; "Look inside" opens the 3D stack.
  On phones the projects simply follow one another, each in its own glass.
*/
type Locale = 'pt' | 'en' | 'ja';
export type ShowcaseCopy = {
  of: string; next: string; inside: string; watch: string; stop: string; close: string; tryLabel: string;
  story: { for: string; challenge: string; built: string; happened: string; idle: string };
};

const AIM = 700;     // ms the ring takes to reach a control
const TYPE = 36;     // ms per typed character
const DWELL = 2200;  // ms each guided step leaves to read what happened
const sleep = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));

/** Each project's light, from its own product's colours. */
const LIGHT: Record<ProjectId, [string, string, string]> = {
  marketing: ['#C16042', '#183255', '#E8D8C5'],
  workhub: ['#672146', '#2F5F9E', '#F7E9EE'],
  wsn: ['#0B3A6B', '#3E9A12', '#EEF5FC'],
  tasks: ['#B03A0B', '#4A4337', '#E6E3DC'],
  connections: ['#183255', '#C16042', '#CCD6DB'],
};

function Slide({ item, index, total, t, state, hero, locale, onInside }: {
  item: ExplorerItem; index: number; total: number; t: ShowcaseCopy; state: 'before' | 'active' | 'after';
  hero: Record<Locale, HeroCopy>; locale: Locale; onInside: (index: number) => void;
}) {
  const { project, copy } = item;
  const screen = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLSpanElement>(null);
  const run = useRef(0);
  const [happened, setHappened] = useState<{ text: string; at: number }[]>([]);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [miniKey, setMiniKey] = useState(0);
  const fit = useRef<HTMLDivElement>(null);

  // The interface keeps the size it was designed at (landscape, or portrait when narrow) and is
  // scaled whole to fit the glass screen, as the 3D stack does: nothing reflows or gets cut.
  useEffect(() => {
    const view = screen.current, plate = fit.current;
    if (!view || !plate) return;
    const place = () => {
      const w = view.clientWidth;
      const [bw, bh] = w < 520 ? [380, 600] : [760, 476];
      view.style.setProperty('--ar', `${bw} / ${bh}`);
      const h = view.clientHeight || w * bh / bw;
      const k = Math.min(w / bw, h / bh);
      plate.style.width = `${bw}px`; plate.style.height = `${bh}px`;
      plate.style.transform = `translate(${(w - bw * k) / 2}px, ${(h - bh * k) / 2}px) scale(${k})`;
    };
    place();
    const sized = new ResizeObserver(place);
    sized.observe(view);
    return () => sized.disconnect();
  }, []);

  const act = useCallback((flow: string) => {
    const said = copy.effects[flow];
    if (said) setHappened(list => [{ text: said, at: performance.now() }, ...list].slice(0, 3));
  }, [copy]);

  const guide = (target: HTMLElement | null, press = false) => {
    const el = ring.current, box = screen.current;
    if (!el || !box) return;
    if (!target) { delete el.dataset.on; return; }
    const a = box.getBoundingClientRect(), b = target.getBoundingClientRect();
    el.style.transform = `translate(${b.left - a.left + b.width / 2}px, ${b.top - a.top + b.height / 2}px)`;
    el.dataset.on = '';
    if (press) { el.dataset.press = ''; window.setTimeout(() => delete el.dataset.press, 260); }
  };

  const stop = useCallback(() => { run.current++; setPlaying(false); guide(null); }, []);
  const watch = async () => {
    if (playing) { stop(); return; }
    const id = ++run.current;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setMiniKey(k => k + 1); setHappened([]); setPlaying(true);
    await sleep(400);
    for (const [i, step] of project.steps.entries()) {
      if (run.current !== id) return;
      setStep(i);
      const target = screen.current?.querySelector<HTMLElement>(step.target);
      if (!target) continue;
      guide(target);
      await sleep(still ? 150 : AIM);
      if (run.current !== id) return;
      if (step.type && target instanceof HTMLInputElement) {
        const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
        for (let n = 1; n <= step.type.length; n++) {
          if (run.current !== id) return;
          set.call(target, step.type.slice(0, n));
          target.dispatchEvent(new Event('input', { bubbles: true }));
          if (!still) await sleep(TYPE);
        }
        await sleep(300);
        guide(target, true);
        target.form?.requestSubmit();
      } else { guide(target, true); target.click(); }
      await sleep(DWELL);
    }
    if (run.current === id) { setPlaying(false); guide(null); }
  };
  // Leaving the stage stops a guided run.
  useEffect(() => { if (state !== 'active') stop(); }, [state, stop]);

  const mini: Record<ProjectId, ReactNode> = {
    marketing: <MarketingMini key={miniKey} act={act} />,
    workhub: <WorkhubMini key={miniKey} act={act} />,
    wsn: <WsnMini key={miniKey} act={act} />,
    tasks: <TasksMini key={miniKey} act={act} />,
    connections: <ConnectionsMini key={miniKey} act={act} hero={hero} locale={locale} />,
  };
  const light = LIGHT[project.id];

  return <article className="sc-slide" data-state={state} aria-hidden={state !== 'active' || undefined}
    style={{ '--l1': light[0], '--l2': light[1], '--l3': light[2] } as CSSProperties} aria-labelledby={`vitrine-${project.id}`}>
    <div className="sc-lights" aria-hidden="true"><i /><i /><i /></div>
    <p className="sc-giant" aria-hidden="true">{project.name}</p>

    <header className="sc-head">
      <p className="sc-count">{String(index + 1).padStart(2, '0')}<span> {t.of} {String(total).padStart(2, '0')}</span></p>
      <h3 id={`vitrine-${project.id}`}>{project.name}</h3>
      <p className="sc-meta"><span className="sc-status" data-status={item.status}><i />{item.statusLabel}</span><span>{item.client}</span><span>{copy.kind}</span></p>
      <div className="sc-actions">
        <button type="button" className="sc-btn sc-btn-main" onClick={watch} aria-pressed={playing}>
          <span className="sc-play" data-icon={playing ? 'stop' : 'play'} aria-hidden="true" />{playing ? t.stop : t.watch}
        </button>
        <button type="button" className="sc-btn" onClick={() => onInside(index)}>
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m10 3 7 3.5-7 3.5-7-3.5zM3 10l7 3.5 7-3.5M3 13.5 10 17l7-3.5" /></svg>
          {t.inside}
        </button>
      </div>
    </header>

    <div className="sc-device">
      <div className="sc-glass sc-screen">
        <div className="sc-bar"><span className="sc-dots"><i /><i /><i /></span><span className="sc-title">{project.name}</span></div>
        <div ref={screen} className="sc-view" data-playing={playing || undefined} onPointerDown={() => { if (playing) stop(); }}>
          <div ref={fit} className="sc-fit">{mini[project.id]}</div>
          {playing && <p className="sc-caption" aria-live="polite"><span>{step + 1}/{project.steps.length}</span>{copy.steps[step]}</p>}
          <span ref={ring} className="sc-ring" aria-hidden="true"><img src="/brand/ring-orange.svg" alt="" width={30} height={30} /></span>
        </div>
      </div>
    </div>

    <aside className="sc-glass sc-phone">
      <span className="sc-notch" aria-hidden="true" />
      <p className="sc-summary">{copy.summary}</p>
      <dl className="sc-brief">
        <div><dt>{t.story.for}</dt><dd>{copy.story.for}</dd></div>
        <div><dt>{t.story.challenge}</dt><dd>{copy.story.challenge}</dd></div>
      </dl>
      <div className="sc-built">
        <p>{t.story.built}</p>
        <ul>{copy.story.built.map(entry => <li key={entry}><svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4.5 10.5 3.5 3.5 7.5-8" /></svg>{entry}</li>)}</ul>
      </div>
      <div className="sc-happened" aria-live="polite">
        <p>{t.story.happened}</p>
        {happened.length
          ? <ol>{happened.map((entry, i) => <li key={entry.at} data-latest={i === 0 || undefined}>{entry.text}</li>)}</ol>
          : <span className="sc-idle"><b>{t.tryLabel}</b> {copy.try}</span>}
      </div>
    </aside>
  </article>;
}

export function ProjectShowcase({ items, t, hero, locale, explorer }: {
  items: ExplorerItem[]; t: ShowcaseCopy; hero: Record<Locale, HeroCopy>; locale: Locale;
  /** The copy of the 3D stack, opened over the page for one project. */
  explorer: ExplorerCopy;
}) {
  const track = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  // Below the wide layout the projects follow one another: every one is on screen in turn.
  const [stacked, setStacked] = useState(false);
  const total = items.length;
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1100px)');
    const read = () => setStacked(!wide.matches);
    read();
    wide.addEventListener('change', read);
    return () => wide.removeEventListener('change', read);
  }, []);

  // The camera: how far the track has been scrolled through picks the project on stage.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const box = el.getBoundingClientRect();
      const span = box.height - window.innerHeight;
      if (span <= 0) return;
      const p = Math.min(1, Math.max(0, -box.top / span));
      setProgress(p);
      setActive(Math.min(total - 1, Math.floor(p * total * 0.999)));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [total]);

  const jump = (index: number) => {
    const el = track.current;
    if (!el) return;
    const span = el.offsetHeight - window.innerHeight;
    if (span <= 0) { setActive(index); return; }
    const top = el.getBoundingClientRect().top + window.scrollY + span * ((index + 0.5) / total);
    window.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  const showInside = (index: number) => { setOpen(index); requestAnimationFrame(() => dialog.current?.showModal()); };
  const close = () => { dialog.current?.close(); };

  return <>
    <div ref={track} className="sc-track" style={{ '--n': total } as CSSProperties}>
      <div className="sc-stage">
        {items.map((item, i) => <Slide key={item.project.id} item={item} index={i} total={total} t={t} hero={hero} locale={locale}
          state={stacked || i === active ? 'active' : i < active ? 'before' : 'after'} onInside={showInside} />)}
        <nav className="sc-nav" aria-label={t.of}>
          {items.map((item, i) => <button key={item.project.id} type="button" aria-current={i === active || undefined} onClick={() => jump(i)}>
            <i /><span>{item.project.name}</span>
          </button>)}
          <span className="sc-progress" aria-hidden="true"><i style={{ transform: `scaleX(${progress})` }} /></span>
        </nav>
        <p className="sc-next" aria-hidden="true" data-last={active === total - 1 || undefined}><span />{t.next}</p>
      </div>
    </div>
    <dialog ref={dialog} className="sc-dialog" onClose={() => setOpen(null)} onClick={event => { if (event.target === dialog.current) close(); }}>
      <div className="sc-dialog-body">
        <button type="button" className="sc-close" onClick={close} aria-label={t.close}>
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15" /></svg>
        </button>
        <ProjectExplorer key={open ?? 0} start={open ?? 0} items={items} hero={hero} locale={locale} t={explorer} />
      </div>
    </dialog>
  </>;
}
