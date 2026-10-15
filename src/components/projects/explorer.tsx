'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { layerIds, type Flow, type InfraRole, type LayerId, type Node, type Project, type ProjectStatus } from '@/data/projects';
import { Arrow } from '../arrow';
import { ConnectionsMini, type HeroCopy } from './minis/connections';
import { MarketingMini } from './minis/marketing';
import { TasksMini } from './minis/tasks';
import { WorkhubMini } from './minis/workhub';
import { WsnMini } from './minis/wsn';
import { Scene, type SceneHandle, type Values } from './scene';

export type ExplorerItem = {
  project: Project;
  client: string;
  status: ProjectStatus;
  statusLabel: string;
  history: string;
  copy: { kind: string; summary: string; try: string; layers: Record<LayerId, string>; tech: Record<string, string>; steps: string[] };
};
export type ExplorerCopy = {
  tabs: string; layers: Record<LayerId, string>; facts: Record<string, string>; hint: string; tryLabel: string;
  front: string; back: string; reset: string; trace: string; traceIdle: string; more: string; stackLabel: string;
  repo: string; privateRepo: string; newTab: string;
  roles: Record<InfraRole, string>; routes: string; columns: string; response: string; clickNode: string;
  play: { start: string; pause: string; resume: string; again: string; label: string; step: string };
  inspect: { request: string; service: string; data: string; effect: string; response: string };
};
type Play = { state: 'idle' | 'playing' | 'paused' | 'done'; step: number };
type Locale = 'pt' | 'en' | 'ja';

const SWAP = 360;   // ms the drawing takes to step back before the next project comes in
const AIM = 850;    // ms the guide takes to reach a control
const TYPE = 38;    // ms per typed character
const DWELL = 3000; // ms a guided step leaves for its request to travel and land
const fill = (template: string, n: number) => template.replace('{n}', String(n));
/** A flow with the interface's values in its placeholders. */
const filled = (flow: Flow, values: Values = {}): Flow => {
  const put = (text: string) => text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? '…'));
  return { ...flow, call: put(flow.call), sql: put(flow.sql), body: flow.body && put(flow.body) };
};
const sleep = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));

/** A number that counts up when it first shows or changes (instantly with reduced motion). */
function Count({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{shown}</>;
}

/*
  The projects, one at a time: tabs choose the project, the scene takes it apart, the panel
  says what each layer is made of. Choosing a layer or a node in either place opens it in
  the other; using the interface sends a request down the stack and the panel spells it out.
*/
export function ProjectExplorer({ items, t, hero, locale }: { items: ExplorerItem[]; t: ExplorerCopy; hero: Record<Locale, HeroCopy>; locale: Locale }) {
  const [current, setCurrent] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [layer, setLayer] = useState<LayerId>('interface');
  const [picked, setPicked] = useState<{ layer: LayerId; node: Node } | null>(null);
  const [focus, setFocus] = useState(false);
  const [trace, setTrace] = useState<{ flow: Flow; at: number } | null>(null);
  const scene = useRef<SceneHandle | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const swap = useRef(0);
  const [play, setPlay] = useState<Play>({ state: 'idle', step: -1 });
  const [miniKey, setMiniKey] = useState(0);
  const runId = useRef(0);
  const doneStep = useRef(-1);
  const item = items[current];
  const { project, copy } = item;

  const pick = (index: number) => {
    if (index === current && !leaving) return;
    // On narrow screens the tabs scroll sideways: bring the chosen one fully into view.
    const tab = tabs.current[index], list = tab?.parentElement;
    if (tab && list && list.scrollWidth > list.clientWidth) {
      const gutter = parseFloat(getComputedStyle(list).paddingLeft) || 0;
      list.scrollTo({ left: Math.max(0, tab.offsetLeft - gutter), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    clearTimeout(swap.current);
    runId.current++;
    const reset = () => { setCurrent(index); setLayer('interface'); setPicked(null); setFocus(false); setTrace(null); setLeaving(false); setPlay({ state: 'idle', step: -1 }); };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { reset(); return; }
    setLeaving(true);
    swap.current = window.setTimeout(reset, SWAP);
  };
  useEffect(() => () => clearTimeout(swap.current), []);
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next = -1;
    if (event.key in keys) next = (current + keys[event.key] + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    if (next < 0) return;
    event.preventDefault();
    pick(next);
    tabs.current[next]?.focus();
  };

  useEffect(() => {
    if (!focus) return;
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setFocus(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focus]);

  const register = useCallback((handle: SceneHandle) => { scene.current = handle; }, []);
  const act = useCallback((flow: string, from: HTMLElement, values?: Values) => {
    const route = project.flows[flow];
    if (!route) return;
    const request = filled(route, values);
    setTrace({ flow: request, at: performance.now() });
    scene.current?.run(request, from);
    // A card that moves column is a new element: keyboard focus follows it to its next control.
    if (document.activeElement === from && from.dataset.id) {
      const id = from.dataset.id;
      requestAnimationFrame(() => {
        if (from.isConnected) return;
        // Its next control, or, when it has none left, the next control of the interface.
        (scene.current?.find(`[data-id="${CSS.escape(id)}"]`) ?? scene.current?.find('[data-flow]:not(:disabled)'))?.focus({ preventScroll: true });
      });
    }
  }, [project]);

  // The guided run: the brand's ring works the live interface, one step at a time, and the
  // stack and the inspector answer each step as they would a visitor.
  const perform = useCallback(async (from: number, id: number) => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const steps = project.steps;
    for (let i = from; i < steps.length; i++) {
      if (runId.current !== id) return;
      setPlay({ state: 'playing', step: i });
      const step = steps[i];
      const target = scene.current?.find(step.target);
      if (!target) continue;
      scene.current?.guide(target);
      await sleep(still ? 200 : AIM);
      if (runId.current !== id) return;
      if (step.type && target instanceof HTMLInputElement) {
        const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
        for (let n = 1; n <= step.type.length; n++) {
          if (runId.current !== id) return;
          set.call(target, step.type.slice(0, n));
          target.dispatchEvent(new Event('input', { bubbles: true }));
          if (!still) await sleep(TYPE);
        }
        await sleep(still ? 100 : 380);
        if (runId.current !== id) return;
        scene.current?.guide(target, true);
        target.form?.requestSubmit();
      } else {
        scene.current?.guide(target, true);
        target.click();
      }
      doneStep.current = i;
      // Reduced motion removes the travel, not the time to read what happened.
      await sleep(still ? DWELL - 600 : DWELL);
    }
    if (runId.current !== id) return;
    scene.current?.guide(null);
    setPlay({ state: 'done', step: steps.length - 1 });
  }, [project]);
  const startPlay = useCallback(async () => {
    const id = ++runId.current;
    doneStep.current = -1;
    // A fresh interface, the drawing open, the interface chosen.
    setMiniKey(k => k + 1);
    setFocus(false);
    setLayer('interface');
    setPicked(null);
    setTrace(null);
    setPlay({ state: 'playing', step: 0 });
    await sleep(500);
    if (runId.current === id) perform(0, id);
  }, [perform]);
  const pausePlay = useCallback(() => {
    runId.current++;
    scene.current?.guide(null);
    setPlay(current => current.state === 'playing' ? { state: 'paused', step: current.step } : current);
  }, []);
  const resumePlay = () => perform(doneStep.current + 1, ++runId.current);
  useEffect(() => () => { runId.current++; }, []);
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (play.state !== 'playing' || !stage.current) return;
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) pausePlay(); }, { threshold: 0.2 });
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, [play.state, pausePlay]);
  useEffect(() => { if (focus) pausePlay(); }, [focus, pausePlay]);
  const chooseLayer = (id: LayerId) => { setLayer(id); setPicked(current => current?.layer === id ? current : null); };
  const chooseNode = (id: LayerId, node: Node) => { setLayer(id); setPicked({ layer: id, node }); };
  const labelOf = (id: LayerId, name?: string) => project.layers[id].nodes.find(n => n.id === name)?.label ?? name;

  const mini = {
    marketing: <MarketingMini key={miniKey} act={act} />,
    workhub: <WorkhubMini key={miniKey} act={act} />,
    wsn: <WsnMini key={miniKey} act={act} />,
    tasks: <TasksMini key={miniKey} act={act} />,
    connections: <ConnectionsMini key={miniKey} act={act} hero={hero} locale={locale} />,
  }[project.id];

  return <div className="xp">
    <div className="xp-tabs" role="tablist" aria-label={t.tabs}>
      {items.map(({ project: p, copy: c }, i) => <button
        key={p.id}
        ref={element => { tabs.current[i] = element; }}
        type="button"
        role="tab"
        id={`aba-${p.id}`}
        aria-selected={i === current}
        aria-controls={`projeto-${p.id}`}
        tabIndex={i === current ? 0 : -1}
        className="xp-tab"
        onClick={() => pick(i)}
        onKeyDown={onTabKey}
      >
        <span className="xp-tab-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
        <span className="xp-tab-name">{p.name}</span>
        <span className="xp-tab-kind">{c.kind}</span>
      </button>)}
    </div>

    <div ref={stage} className="xp-stage" data-project={project.id}>
      <Scene
        key={project.id}
        project={project}
        layer={layer}
        node={picked?.node.id}
        focus={focus}
        leaving={leaving}
        labels={t.layers}
        interfaceLabel={t.layers.interface}
        t={{ more: t.more, roles: t.roles, routes: t.routes, columns: t.columns, reset: t.reset, back: t.back }}
        onLayer={chooseLayer}
        onNode={chooseNode}
        onFocus={setFocus}
        guided={play.state === 'playing'}
        onManual={pausePlay}
        register={register}
      >{mini}</Scene>
      <div className="xp-player" data-state={play.state}>
        <button type="button" className="button button-primary button-small xp-play" onClick={() => play.state === 'playing' ? pausePlay() : play.state === 'paused' ? resumePlay() : startPlay()}>
          <span className="xp-play-icon" data-icon={play.state === 'playing' ? 'pause' : play.state === 'done' ? 'again' : 'play'} aria-hidden="true" />
          {play.state === 'playing' ? t.play.pause : play.state === 'paused' ? t.play.resume : play.state === 'done' ? t.play.again : t.play.start}
        </button>
        {play.state === 'idle'
          ? <p className="xp-hint">{t.hint}</p>
          : <div className="xp-caption" aria-live="polite">
            <ol className="xp-steps" aria-label={t.play.label}>
              {project.steps.map((_, i) => <li key={i} data-state={i < play.step || play.state === 'done' ? 'done' : i === play.step ? 'now' : undefined} />)}
            </ol>
            <p><span>{t.play.step.replace('{i}', String(play.step + 1)).replace('{n}', String(project.steps.length))}</span>{copy.steps[play.step]}</p>
          </div>}
      </div>
    </div>

    <aside className="xp-panel" id={`projeto-${project.id}`} role="tabpanel" aria-labelledby={`aba-${project.id}`} data-leaving={leaving || undefined}>
      <div className="xp-panel-main">
      <header className="xp-head">
        <p className="project-meta">
          <span className="project-status" data-status={item.status}><span aria-hidden="true" />{item.statusLabel}</span>
          <span>{item.client}</span>
        </p>
        <h3>{project.name}</h3>
        <p className="xp-summary">{copy.summary}</p>
      </header>
      <dl className="xp-facts" key={`facts-${project.id}`}>
        {project.facts.map(fact => <div key={fact.id}><dd><Count value={fact.value} /></dd><dt>{t.facts[fact.id]}</dt></div>)}
      </dl>
      <p className="xp-try"><b>{t.tryLabel}</b>{copy.try}</p>
      <footer className="xp-foot">
        <button type="button" className="button button-secondary button-small" aria-pressed={focus} onClick={() => setFocus(f => !f)}>{focus ? t.back : `${t.front} · ${t.layers[layer]}`}</button>
        <p className="xp-history">{item.history}</p>
        {project.repo
          ? <a className="text-link" href={project.repo} target="_blank" rel="noopener noreferrer">{t.repo}<span className="sr-only"> {t.newTab}</span><Arrow /></a>
          : <span className="xp-private">{t.privateRepo}</span>}
      </footer>
      </div>

      <div className="xp-panel-side">

      <ol className="xp-layers">
        {layerIds.map((id, i) => {
          const open = layer === id;
          const chosen = picked?.layer === id ? picked.node : null;
          return <li key={id} data-open={open || undefined}>
            <button type="button" className="xp-layer" aria-expanded={open} aria-controls={`camada-${project.id}-${id}`} onClick={() => chooseLayer(id)}>
              <span className="xp-layer-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <span className="xp-layer-name">{t.layers[id]}</span>
              <span className="xp-layer-tech">{project.layers[id].tech.map(x => x.name).join(' · ')}</span>
            </button>
            <div className="xp-layer-body" id={`camada-${project.id}-${id}`} hidden={!open}>
              <p>{copy.layers[id]}</p>
              {chosen && <div className="xp-node-card" key={chosen.id} data-kind={id}>
                <p className="xp-node-card-name"><code>{chosen.label}</code>
                  {chosen.count ? <span>{fill(id === 'data' ? t.columns : t.routes, chosen.count)}</span> : null}
                  {chosen.role && <span>{t.roles[chosen.role]}</span>}
                </p>
                {chosen.meta && <p className="xp-node-card-meta"><code>{chosen.meta}</code></p>}
                {chosen.columns && <ul className="xp-node-card-cols">
                  {chosen.columns.map(column => { const [name, ref] = column.split(' →'); return <li key={column}><code>{name}</code>{ref && <span>→ <code>{ref}</code></span>}</li>; })}
                </ul>}
              </div>}
              {!chosen && id !== 'interface' && <p className="xp-node-hint">{t.clickNode}</p>}
              <dl>
                {project.layers[id].tech.map(x => <div key={x.id}>
                  <dt>{x.name}{x.version && <span>{x.version}</span>}</dt>
                  <dd>{copy.tech[x.id]}</dd>
                </div>)}
              </dl>
            </div>
          </li>;
        })}
      </ol>

      <div className="xp-trace" aria-live="polite">
        <p className="xp-trace-title">{t.trace}</p>
        {trace
          ? <ol key={trace.at} className="xp-inspect">
            <li data-step="request"><span className="xp-inspect-label">{t.inspect.request}</span><span className="xp-inspect-value"><b>{trace.flow.method}</b> <code>{trace.flow.call}</code>{trace.flow.body && <code className="xp-code">{trace.flow.body}</code>}</span></li>
            <li data-step="service"><span className="xp-inspect-label">{t.inspect.service}</span><span className="xp-inspect-value"><code>{labelOf('services', trace.flow.service)}</code> <small>{project.layers.services.tech.slice(0, 2).map(x => x.name).join(' · ')}</small></span></li>
            <li data-step="data"><span className="xp-inspect-label">{t.inspect.data}</span><span className="xp-inspect-value"><b>{trace.flow.op}</b> <code>{labelOf('data', trace.flow.table)}</code><code className="xp-code">{trace.flow.sql}</code></span></li>
            {trace.flow.infra && <li data-step="effect"><span className="xp-inspect-label">{t.inspect.effect}</span><span className="xp-inspect-value"><code>{labelOf('infra', trace.flow.infra)}</code> <small>{(() => { const role = project.layers.infra.nodes.find(n => n.id === trace.flow.infra)?.role; return role ? t.roles[role] : ''; })()}</small></span></li>}
            <li data-step="response"><span className="xp-inspect-label">{t.inspect.response}</span><span className="xp-inspect-value"><b>←</b> {t.layers.interface}</span></li>
          </ol>
          : <p className="xp-trace-idle">{t.traceIdle}</p>}
      </div>

      </div>
    </aside>
  </div>;
}
