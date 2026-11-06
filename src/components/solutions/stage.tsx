'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { solutionIds, type SolutionId } from '@/data/site';
import type { Dictionary, SolutionScenes } from '@/i18n/types';

/*
  The Solutions scenes: each service shown working, in a small product UI, quick to take in.
  - Sites: first in the search, the same site on desktop and phone, a contact arriving.
  - Systems: the spreadsheets merge into one system; an order moves and the stock follows.
  - Dashboards: a live panel, numbers counting, sales against the target, where to act.
  - E-commerce: the customer buys alone; payment, order and stock follow.

  On wide screens one sticky window follows the service being read (its data-active, set by
  scroll-effects); on phones each service carries its own window. A scene plays once when it
  is on screen (at a brisk pace, --pace); "Watch again" replays it. Scenes restart by
  remounting (the key); resting styles are the last frame, so reduced motion and no
  JavaScript simply show it finished.
*/
type T = Dictionary['solutions'];
/** Delay (seconds) for an element's entrance in the scene timeline. */
const at = (d: number, extra?: CSSProperties) => ({ '--d': `${d}s`, ...extra } as CSSProperties);

const Icon = ({ d, size = '1.15em' }: { d: string; size?: string }) => <svg viewBox="0 0 20 20" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const WARN = 'M10 3.5 17.5 16.5h-15zM10 8.5v3.5M10 14.4v.1';
const CHECK = 'm4.5 10.5 3.5 3.5 7.5-8';
const CHAT = 'M4 4.5h12a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1z';
const SHEET = 'M5 2.8h7l3.5 3.5V17a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V3.3a.5.5 0 0 1 .5-.5zM12 2.8v3.5h3.5M7 10h6.5M7 13h6.5M10 8v7.5';
const BAG = 'M5 7h10l-.8 9.5a1 1 0 0 1-1 .9H6.8a1 1 0 0 1-1-.9zM7.5 7V5.5a2.5 2.5 0 0 1 5 0V7';
const BELL = 'M5.5 13.5V9a4.5 4.5 0 0 1 9 0v4.5l1.5 1.5h-12zM8.5 17h3';

function AppBar({ address }: { address?: string }) {
  return <div className="sx-bar"><span className="sx-dots"><i /><i /><i /></span>{address && <span className="sx-address"><Icon d="M6 9V6.5a4 4 0 0 1 8 0V9M5 9h10v7H5z" size="1em" />{address}</span>}</div>;
}

function Sites({ s }: { s: SolutionScenes['sites'] }) {
  return <div className="sx-sites-solution">
    <span className="sx-tag sx-tag-good sx-rank a-pop" style={at(.2)}><Icon d={CHECK} />{s.rank}</span>
    <div className="sx-app sx-desktop a-pop" style={at(.5)}>
      <AppBar address={s.domain} />
      <div className="sx-site">
        <div className="sx-site-nav a-up" style={at(.8)}><i className="sx-logo" /><span /><span /><span /></div>
        <div className="sx-site-hero">
          <span className="sx-h1 a-grow" style={at(1)} /><span className="sx-h2 a-grow" style={at(1.1)} />
          <span className="sx-cta a-pop" style={at(1.3)}>{s.cta}</span>
        </div>
        <div className="sx-site-cards">{[0, 1, 2].map(i => <span key={i} className="a-up" style={at(1.5 + i * .12)} />)}</div>
      </div>
    </div>
    <div className="sx-app sx-phone a-slide" style={at(2)}>
      <div className="sx-site sx-site-m">
        <div className="sx-site-nav"><i className="sx-logo" /><span className="sx-burger" /></div>
        <span className="sx-h1" /><span className="sx-h2" />
        <span className="sx-cta">{s.cta}</span>
        <span className="sx-mcard" /><span className="sx-mcard" />
      </div>
      <span className="sx-chat a-pop" style={at(2.6)}><Icon d={CHAT} /></span>
    </div>
    <div className="sx-toast a-toast" style={at(3.3)}>
      <span className="sx-toast-icon"><Icon d={BELL} /></span>
      <div><b>{s.toast}</b><small>{s.toastText}</small></div>
    </div>
  </div>;
}

const scattered = [{ x: 4, y: 6, r: -7 }, { x: 54, y: 2, r: 5 }, { x: 8, y: 58, r: 4 }, { x: 52, y: 62, r: -5 }];

function Sistemas({ s }: { s: SolutionScenes['sistemas'] }) {
  const files = s.files.map((name, i) => <span key={name} className={`sx-file sx-file-${i} a-merge`}
    style={at(0, { '--x': `${scattered[i].x}%`, '--y': `${scattered[i].y}%`, '--r': `${scattered[i].r}deg` } as CSSProperties)}>
    <Icon d={SHEET} />{name}
  </span>);
  return <div className="sx-erp-solution">
    <div className="sx-merging" aria-hidden="true">{files}</div>
    <div className="sx-app sx-erp a-pop" style={at(.7)}>
      <AppBar />
      <div className="sx-erp-body">
        <aside className="sx-erp-side">
          <i className="sx-logo" />
          {s.modules.map((m, i) => <span key={m} className={`a-up ${i === 0 ? 'is-on' : ''}`} style={at(1 + i * .1)}>{m}</span>)}
        </aside>
        <div className="sx-erp-main">
          <b className="sx-erp-title">{s.orders}</b>
          <ul className="sx-table">
            {s.rows.map((row, i) => <li key={row} className="a-up" style={at(1.3 + i * .12)}>
              <span>{row}</span>
              {i === 0
                ? <span className="sx-steps">
                    <i className="sx-pill sx-pill-0">{s.statuses[0]}</i>
                    <i className="sx-pill sx-pill-1">{s.statuses[1]}</i>
                    <i className="sx-pill sx-pill-2">{s.statuses[2]}</i>
                  </span>
                : <i className={`sx-pill ${i === 1 ? 'sx-pill-done' : 'sx-pill-new'}`}>{s.statuses[i === 1 ? 2 : 0]}</i>}
            </li>)}
          </ul>
          <div className="sx-erp-cards">
            <div className="sx-stock a-up" style={at(1.7)}>
              <small>{s.stockLabel}</small>
              <span className="sx-swap"><b className="sx-swap-old">12</b><b className="sx-swap-new">11</b></span>
            </div>
            <div className="sx-team a-up" style={at(1.85)}>
              <span className="sx-avatars">{s.team.map(name => <i key={name} title={name}>{name[0]}</i>)}</span>
              <small>{s.shared}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div className="sx-toast a-toast" style={at(3.4)}>
      <span className="sx-toast-icon"><Icon d={CHECK} /></span>
      <div><b>{s.toast}</b><small>{s.stockLabel}: 12 → 11</small></div>
    </div>
  </div>;
}

function Dashboards({ s }: { s: SolutionScenes['dashboards'] }) {
  const units = [78, 64, 41, 70];
  return <div className="sx-app sx-dash a-pop" style={at(0)}>
    <AppBar />
    <div className="sx-dash-body">
      <div className="sx-dash-head a-up" style={at(.3)}>
        <b>{s.title}</b>
        <span className="sx-chip">{s.period}</span><span className="sx-chip">{s.unit}</span>
        <span className="sx-live"><i />{s.live}</span>
      </div>
      <div className="sx-kpis">
        {s.kpis.map((k, i) => <div key={k.label} className="sx-kpi a-up" style={at(.5 + i * .12)}>
          <small>{k.label}</small>
          <b>{k.prefix}<span className="sx-count" style={at(.6 + i * .12, { '--to': k.value } as CSSProperties)} />{k.suffix}</b>
        </div>)}
      </div>
      <div className="sx-charts">
        <div className="sx-chart a-up" style={at(.9)}>
          <small>{s.trend}</small>
          <svg viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true">
            <path className="sx-target" d="M0 34H300" />
            <path className="sx-area a-fade" style={at(2.2)} d="M0 104C30 98 44 86 70 88S112 70 136 66S178 58 200 48S250 40 272 36L300 32V120H0Z" />
            <path className="sx-trend a-draw" style={at(1.1)} pathLength={1} d="M0 104C30 98 44 86 70 88S112 70 136 66S178 58 200 48S250 40 272 36L300 32" />
          </svg>
          <span className="sx-target-label">{s.target}</span>
          <span className="sx-end a-pop" style={at(2.4)} />
        </div>
        <div className="sx-units a-up" style={at(1)}>
          {s.units.map((u, i) => <span key={u} className={i === 2 ? 'is-low' : ''}>
            <i className="a-rise" style={at(1.3 + i * .12, { height: `${units[i]}%` })} />
            <small>{u}</small>
          </span>)}
          <span className="sx-tag sx-tag-bad sx-act a-pop" style={at(2.8)}><Icon d={WARN} />{s.act}</span>
        </div>
      </div>
    </div>
  </div>;
}

function Ecommerce({ s }: { s: SolutionScenes['ecommerce'] }) {
  return <div className="sx-shop-solution">
    <div className="sx-app sx-product a-pop" style={at(0)}>
      <div className="sx-photo"><Icon d="M6 3.5 3 6l2 3 1.5-1V17h7V8L15 9l2-3-3-2.5c-.6 1.3-2.2 2-4 2s-3.4-.7-4-2z" size="44%" /></div>
      <div className="sx-product-info">
        <b>{s.product}</b><span className="sx-price">{s.price}</span>
        <span className="sx-sizes">{s.sizes.map((z, i) => <i key={z} className={i === 1 ? 'is-on' : ''}>{z}</i>)}</span>
        <span className="sx-add a-press" style={at(1)}><Icon d={BAG} />{s.add}</span>
      </div>
      <span className="sx-cart a-pop" style={at(1.3)}><Icon d={BAG} /><i>1</i></span>
    </div>
    <div className="sx-app sx-checkout a-slide" style={at(1.6)}>
      <div className="sx-line"><span>{s.shipping}</span><span>{s.shippingValue}</span></div>
      <div className="sx-line sx-line-total"><span>{s.total}</span><b>{s.totalValue}</b></div>
      <div className="sx-pay"><span className="sx-chip">{s.pay}</span><span className="sx-paid a-pop" style={at(2.5)}><Icon d={CHECK} />{s.paid}</span></div>
    </div>
    <div className="sx-toast a-toast" style={at(3.1)}>
      <span className="sx-toast-icon"><Icon d={BELL} /></span>
      <div><b>{s.order}</b><small>{s.orderTime}</small><small className="sx-toast-extra">{s.stock}</small></div>
    </div>
    <ol className="sx-flow">
      {s.flow.map((step, i) => <li key={step} className="a-step" style={at(.3 + i * .55)}><i />{step}</li>)}
    </ol>
  </div>;
}

function Scene({ id, s }: { id: SolutionId; s: SolutionScenes }) {
  if (id === 'sites') return <Sites s={s.sites} />;
  if (id === 'sistemas') return <Sistemas s={s.sistemas} />;
  if (id === 'dashboards') return <Dashboards s={s.dashboards} />;
  return <Ecommerce s={s.ecommerce} />;
}

function SolutionWindow({ id, t, live }: { id: SolutionId; t: T; live: boolean }) {
  const reduced = useRef(false);
  const [ready, setReady] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => { reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches; setReady(true); }, []);
  // It plays once, the first time it is on screen; "Watch again" replays it.
  useEffect(() => { if (live && ready && !reduced.current) setRun(r => r || 1); }, [live, ready]);

  const item = t.items[id];
  const number = String(solutionIds.indexOf(id) + 1).padStart(2, '0');

  return <div className="solwin" data-id={id} data-ready={ready || undefined}>
    <div className="solwin-head">
      <p className="solwin-step"><span className="point" aria-hidden="true" />{number} · {item.title}</p>
      <button type="button" className="solwin-replay" onClick={() => setRun(r => r + 1)}>
        <Icon d="M4.5 10a5.5 5.5 0 1 0 1.8-4.1M4 3.5v3.2h3.2" size="16" />{t.replay}
      </button>
    </div>
    <div className="solwin-body" aria-hidden="true">
      <div key={run} className="sx sx-solution"><Scene id={id} s={t.scenes} /></div>
    </div>
    <p key={run} className="solwin-verdict">
      <span className="solwin-verdict-icon"><Icon d={CHECK} size="16" /></span>
      {item.result}
    </p>
  </div>;
}

/** Wide screens: one sticky window that follows the service being read. */
export function SolutionsPlate({ t }: { t: T }) {
  const plate = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<SolutionId>(solutionIds[0]);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const el = plate.current;
    const list = el?.closest('.solutions')?.querySelector('.solutions-list');
    if (!el || !list) return;
    const read = () => {
      const current = list.querySelector<HTMLElement>('.solution[data-active]')?.dataset.id as SolutionId | undefined;
      if (current) setActive(current);
    };
    read();
    const changes = new MutationObserver(read);
    changes.observe(list, { subtree: true, attributes: true, attributeFilter: ['data-active'] });
    const view = new IntersectionObserver(([entry]) => setLive(entry.isIntersecting && entry.intersectionRatio >= 0.35 && el.offsetParent !== null), { threshold: [0, 0.35] });
    view.observe(el);
    return () => { changes.disconnect(); view.disconnect(); };
  }, []);
  return <div ref={plate} className="solutions-plate"><SolutionWindow key={active} id={active} t={t} live={live} /></div>;
}

/** Phones: each service carries its own window, played when most of it is on screen. */
export function SolutionInline({ id, t }: { id: SolutionId; t: T }) {
  const box = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const view = new IntersectionObserver(([entry]) => setLive(entry.intersectionRatio >= 0.45), { threshold: [0, 0.45] });
    view.observe(el);
    return () => view.disconnect();
  }, []);
  return <div ref={box} className="solution-figure"><SolutionWindow id={id} t={t} live={live} /></div>;
}

