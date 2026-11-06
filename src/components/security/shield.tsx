'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Dictionary } from '@/i18n';

/*
  The Security demo. Each pillar is a short story a visitor understands without knowing any
  technical term: the same scam is played first on an ordinary site, then on ours.
  - 0 Wi-Fi: a message crosses a café network; a snooper reads it, or sees only scrambled text
    (real AES-GCM ciphertext of what the visitor typed, made in their browser).
  - 1 Outside code: a script, an ad and a fake login try to get into the page.
  - 2 Trackers: companies build a profile of the visit, or learn nothing.

  When the section comes into view the three stories play once on their own; clicking a pillar,
  the toggle or "Watch again" takes over. Each scene restarts its CSS animations by remounting
  (the key), and its resting styles are the final frame, so reduced motion and no JavaScript
  simply show the end of the story on our site.
*/
type Scene = 0 | 1 | 2;
type Mode = 'open' | 'safe';
type Story = { scene: Scene; mode: Mode; run: number; then: 'safe' | 'tour' | 'stop' };

const OPEN_MS = 6800;
const SAFE_MS = 7600;

const toBase64 = (bytes: Uint8Array) => { let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };
const scramble = (text: string) => Array.from(text, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'[Math.floor(Math.random() * 64)]).join('');

async function encrypt(text: string) {
  try {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    return toBase64(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text))));
  } catch { return scramble(text + '0000000000'); }
}

const Lock = ({ open = false }: { open?: boolean }) => <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
  <rect x="4" y="9" width="12" height="8" rx="2" /><path d={open ? 'M7 9V6.5a3 3 0 0 1 5.6-1.5' : 'M7 9V6.5a3 3 0 0 1 6 0V9'} />
</svg>;
const Warn = () => <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path d="M10 3.5 17.5 16.5h-15z" /><path d="M10 8.5v3.5M10 14.4v.1" />
</svg>;
const Shield = () => <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path d="M10 2.8 16 5v4.6c0 3.7-2.6 6.3-6 7.6-3.4-1.3-6-3.9-6-7.6V5z" /><path d="m7.3 10 2 2 3.6-3.8" />
</svg>;

/** A small browser window: the address bar says what the browser itself would say. */
function Browser({ mode, t, className = '', children }: { mode: Mode; t: Dictionary['security']['shield']; className?: string; children: ReactNode }) {
  return <div className={`sh-browser ${className}`}>
    <div className="sh-browser-bar">
      <span className="sh-dots" aria-hidden="true"><i /><i /><i /></span>
      <span className={`sh-address sh-address-${mode}`}>
        {mode === 'safe' ? <Lock /> : <><Warn /><b>{t.insecure}</b></>}
        <span>{t.address}</span>
      </span>
    </div>
    <div className="sh-browser-body">{children}</div>
  </div>;
}

function PageSketch() {
  return <div className="sh-sketch" aria-hidden="true">
    <img src="/brand/symbol-light.svg" alt="" width="22" height="22" />
    <span className="sh-bar sh-bar-l" /><span className="sh-bar sh-bar-m" /><span className="sh-bar sh-bar-s" />
    <span className="sh-pill" />
  </div>;
}

function Wire({ mode, t, sent, cipher }: { mode: Mode; t: Dictionary['security']['shield']; sent: string; cipher: string }) {
  const w = t.wire;
  const seen = mode === 'open' ? sent : cipher;
  return <>
    <div className="wire-road">
      <span className="wire-line" aria-hidden="true" />
      <span className="wire-wifi"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M3.5 9.5a12 12 0 0 1 17 0M6.5 12.7a7.6 7.6 0 0 1 11 0M9.5 15.8a3.3 3.3 0 0 1 5 0" /><circle cx="12" cy="18.8" r=".9" fill="currentColor" /></svg>{w.wifi}</span>
      <div className={`wire-packet wire-packet-${mode}`} aria-hidden="true">
        {mode === 'safe' ? <><Lock /><span>{cipher.slice(0, 14)}</span></> : <span>{sent}</span>}
      </div>
      <div className="wire-spy">
        <svg className="wire-spy-figure" viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 58c1-12 8-19 18-19s17 7 18 19" />
          <path d="M18 30c0-11 6-19 14-19s14 8 14 19" />
          <path d="M16 31h32" />
          <circle cx="25" cy="31" r="5" /><circle cx="39" cy="31" r="5" /><path d="M30 31h4" />
        </svg>
        <span className="wire-cap">{w.spy}</span>
        <div className={`wire-spy-bubble wire-spy-${mode}`}>
          <small>{mode === 'open' ? w.reads : w.sees}</small>
          <p>{seen}</p>
          {mode === 'safe' && <em>{w.confused}</em>}
        </div>
      </div>
    </div>
    <div className="wire-col wire-site">
      <span className="wire-cap">{w.site}</span>
      <Browser mode={mode} t={t}>
        <div className="wire-inbox">
          <small>{mode === 'safe' ? <Lock open /> : null}{w.received}</small>
          <p>{sent}</p>
        </div>
      </Browser>
    </div>
  </>;
}

function Inject({ mode, t }: { mode: Mode; t: Dictionary['security']['shield'] }) {
  const s = t.inject;
  return <div className={`inject inject-${mode}`}>
    <Browser mode={mode} t={t} className="inject-page">
      <PageSketch />
      {mode === 'open' && <>
        <div className="inject-fx inject-fx-0">{s.effects[0]} <span aria-hidden="true">›</span></div>
        <div className="inject-fx inject-fx-1"><small>Ad</small>{s.effects[1]}</div>
        <div className="inject-fx inject-fx-2"><b>{s.effects[2]}</b><span className="inject-field">{s.password}<i>••••••••</i></span><span className="inject-button">{s.enter}</span></div>
      </>}
      {mode === 'safe' && <span className="inject-shield" aria-hidden="true" />}
    </Browser>
    {s.threats.map((label, i) => <span key={label} className={`inject-threat inject-threat-${i}`}>
      <span className="inject-threat-icon"><Warn /></span>{label}
      {mode === 'safe' && <b className="inject-stamp">{s.blocked}</b>}
    </span>)}
    {mode === 'safe' && <span className="inject-count"><Shield />{s.count}</span>}
  </div>;
}

function Track({ mode, t }: { mode: Mode; t: Dictionary['security']['shield'] }) {
  const s = t.track;
  return <div className={`track track-${mode}`}>
    <Browser mode="safe" t={t} className="track-page">
      <PageSketch />
      <svg className="track-cursor" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 1.5 13 8l-4.6 1.2L6 13.6z" fill="currentColor" stroke="var(--navy)" strokeWidth="1" strokeLinejoin="round" /></svg>
      <div className="track-tags">
        {mode === 'open'
          ? s.trackers.map((label, i) => <span key={label} className={`track-tag track-tag-${i}`}><i aria-hidden="true" />{label}</span>)
          : <span className="track-tag track-none"><Shield />{s.none}</span>}
      </div>
    </Browser>
    <div className="track-flow" aria-hidden="true">{mode === 'open' && <><i /><i /><i /></>}</div>
    <div className="track-profile">
      <small>{s.profile}</small>
      {mode === 'open'
        ? <ul>{s.facts.map((fact, i) => <li key={fact} className={`track-fact track-fact-${i}`}>{fact}</li>)}</ul>
        : <p className="track-empty"><Lock />{s.empty}</p>}
    </div>
  </div>;
}

export function SecurityShowcase({ t, head }: { t: Dictionary['security']; head: ReactNode }) {
  const c = t.shield;
  const stage = useRef<HTMLDivElement>(null);
  const reduced = useRef(false);
  const [story, setStory] = useState<Story>({ scene: 0, mode: 'safe', run: 0, then: 'stop' });
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState(c.wire.message);
  const [sent, setSent] = useState(c.wire.message);
  // A fixed placeholder until the browser makes the real ciphertext (server and client must match).
  const [cipher, setCipher] = useState('q8Zr1VtX0bL3mE9wPfK2sYc7HnJ4uA6dGx5RkT0pWz8eNh2VbQ1sLm4C');

  useEffect(() => { let live = true; encrypt(sent).then(text => { if (live) setCipher(text); }); return () => { live = false; }; }, [sent]);

  // The tour starts once the piece is well in view, and waits while it is off screen.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReady(true);
    const view = new IntersectionObserver(([entry]) => {
      const inView = entry.intersectionRatio >= 0.4;
      setVisible(inView);
      if (inView) setStory(s => s.run === 0 && !reduced.current ? { scene: 0, mode: 'open', run: 1, then: 'tour' } : s);
    }, { threshold: [0, 0.4] });
    view.observe(el);
    return () => view.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || story.run === 0 || reduced.current) return;
    let next: Story | null = null;
    if (story.mode === 'open' && story.then !== 'stop') next = { ...story, mode: 'safe', run: story.run + 1 };
    else if (story.mode === 'safe' && story.then === 'tour' && story.scene < 2) next = { scene: (story.scene + 1) as Scene, mode: 'open', run: story.run + 1, then: 'tour' };
    if (!next) return;
    const id = window.setTimeout(() => setStory(next), story.mode === 'open' ? OPEN_MS : SAFE_MS);
    return () => window.clearTimeout(id);
  }, [story, visible]);

  const play = (scene: Scene) => setStory(s => reduced.current
    ? { scene, mode: 'safe', run: s.run + 1, then: 'stop' }
    : { scene, mode: 'open', run: s.run + 1, then: 'safe' });
  const show = (mode: Mode) => setStory(s => ({ ...s, mode, run: s.run + 1, then: 'stop' }));
  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, 80);
    if (!text) return;
    setSent(text);
    play(0);
  };

  const { scene, mode, run } = story;
  const verdict = [c.wire, c.inject, c.track][scene][mode];
  const key = `${scene}-${mode}-${run}`;

  return <div className="shell security-grid">
    <div className="security-copy">
      {head}
      <div className="security-pillars" role="tablist" aria-label={t.label} data-reveal="rules">
        {t.pillars.map((item, i) => <button key={item.title} type="button" role="tab" id={`security-tab-${i}`} aria-controls="security-demo"
          aria-selected={scene === i} className="security-pillar" onClick={() => play(i as Scene)}>
          <span className="point" aria-hidden="true" /><b>{item.title}</b><span>{item.text}</span>
        </button>)}
      </div>
    </div>
    <div className="security-piece" data-reveal>
      <div ref={stage} id="security-demo" role="tabpanel" aria-labelledby={`security-tab-${scene}`} className="shield" data-mode={mode} data-scene={scene} data-ready={ready || undefined}>
        <div className="shield-head">
          <p className="shield-step"><span className="point" aria-hidden="true" />0{scene + 1} · {t.pillars[scene].title}</p>
          <div className="shield-modes" role="group" aria-label={c.area}>
            {(['open', 'safe'] as const).map(m => <button key={m} type="button" aria-pressed={mode === m} data-for={m} onClick={() => show(m)}>
              {m === 'open' ? <Warn /> : <Shield />}{c.modes[m]}
            </button>)}
          </div>
        </div>
        <div className="shield-body">
          {scene === 0 && <div className="wire">
            <div className="wire-col wire-you">
              <span className="wire-cap">{c.wire.you}</span>
              <div className="wire-phone">
                <p className="wire-bubble">{sent}</p>
                <form className="wire-form" onSubmit={send}>
                  <label className="sr-only" htmlFor="security-message">{c.wire.field}</label>
                  <input id="security-message" value={draft} maxLength={80} autoComplete="off" placeholder={c.wire.field} onChange={e => setDraft(e.target.value)} />
                  <button type="submit" aria-label={c.wire.send}><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10h11M11 5.5 15.5 10 11 14.5" /></svg></button>
                </form>
              </div>
            </div>
            <Wire key={key} mode={mode} t={c} sent={sent} cipher={cipher} />
          </div>}
          {scene === 1 && <Inject key={key} mode={mode} t={c} />}
          {scene === 2 && <Track key={key} mode={mode} t={c} />}
        </div>
        <div className="shield-foot">
          <p key={key} className={`shield-verdict shield-verdict-${mode}`} aria-live="polite">
            <span className="shield-verdict-icon">{mode === 'open' ? <Warn /> : <Shield />}</span>{verdict}
          </p>
          <button type="button" className="shield-replay" onClick={() => play(scene)}>
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.5 10a5.5 5.5 0 1 0 1.8-4.1" /><path d="M4 3.5v3.2h3.2" /></svg>
            {c.replay}
          </button>
        </div>
      </div>
    </div>
  </div>;
}
