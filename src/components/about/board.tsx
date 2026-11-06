'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Arrow } from '@/components/arrow';
import type { Dictionary } from '@/i18n';

/*
  The About board. A line that keeps naming what we build, and the four facts as cards, each
  with a small scene and a way to the section that proves it:
  - We build: the five kinds of product, lit in turn with the rotating word → Solutions;
  - For: a concrete problem crossed out and solved → Projects;
  - From: the meeting point travelling the four steps → Process;
  - With: the client and the developer, talking directly → Contact.
  The scenes play when the board comes into view and again on hover; with reduced motion the
  word stops on the first one and the scenes show their last frame.
*/
type T = Dictionary['about'];
const ROTATE_MS = 2200;

const icons = [
  'M3 4.5h14v11H3zM3 7.5h14M5.5 6h.01M7.5 6h.01',                                // site
  'M3 4h14v12H3zM3 8h14M3 12h14M8 4v12',                                        // system
  'M3.5 16.5V9M8 16.5V5M12.5 16.5v-6M17 16.5V3.5',                              // dashboard
  'M3 4h2l2 9h8l2-6.5H6.2M8.5 16.5h.01M14.5 16.5h.01',                          // shop
  'M6.5 2.5h7a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1zM9 15h2', // app
];
const Glyph = ({ d }: { d: string }) => <svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

export function AboutBoard({ t }: { t: T }) {
  const b = t.board;
  const root = useRef<HTMLDivElement>(null);
  const [word, setWord] = useState(0);
  const [live, setLive] = useState(false);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const view = new IntersectionObserver(([entry]) => {
      const on = entry.intersectionRatio >= 0.25;
      if (on) setSeen(true);
      setLive(on && !still);
    }, { threshold: [0, 0.25] });
    view.observe(el);
    return () => view.disconnect();
  }, []);
  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => setWord(w => (w + 1) % b.words.length), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [live, b.words.length]);

  const hrefs = ['#solucoes', '#projetos', '#processo', '#contato'];
  const card = (i: number, scene: ReactNode) => <a key={i} href={hrefs[i]} className={`about-card about-card-${i}`} style={{ '--i': i } as CSSProperties}>
    <span className="about-card-term">{t.facts[i].term}</span>
    <span className="about-card-detail">{t.facts[i].detail}</span>
    <span className="about-scene" aria-hidden="true">{scene}</span>
    <span className="about-card-link">{b.links[i]}<Arrow /></span>
  </a>;

  return <>
    <p className="about-rotate">
      <span>{b.rotate}</span>{' '}
      <span className="about-words" aria-hidden="true">
        {b.words.map((w, i) => <span key={w} data-on={i === word || undefined} data-was={i === (word + b.words.length - 1) % b.words.length || undefined}>{w}</span>)}
      </span>
      <span className="sr-only">{b.words.join(', ')}</span>
    </p>

    <div ref={root} className="about-cards" data-seen={seen || undefined}>
      {card(0, <span className="about-icons">{icons.map((d, i) => <i key={i} data-on={i === word || undefined}><Glyph d={d} /></i>)}</span>)}
      {card(1, <span className="about-solve">
        <span className="about-problem">{b.problem}</span>
        <span className="about-solved"><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4.5 10.5 3.5 3.5 7.5-8" /></svg>{b.solved}</span>
      </span>)}
      {card(2, <span className="about-track">
        <span className="about-line" />
        {b.steps.map((step, i) => <span key={step} className="about-stop" style={{ '--s': i } as CSSProperties}><i /><small>{step}</small></span>)}
        <span className="about-dot" />
      </span>)}
      {card(3, <span className="about-talk">
        <span className="about-people"><i className="about-you">{b.you[0]}</i><span className="about-wire"><em /></span><i className="about-dev"><span className="sx-logo" /></i></span>
        <span className="about-bubble about-ask">{b.ask}</span>
        <span className="about-bubble about-answer">{b.answer}</span>
      </span>)}
    </div>
  </>;
}
