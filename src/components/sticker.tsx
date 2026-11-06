'use client';

import { useRef, useState, type PointerEvent } from 'react';

/*
  Manual p.10 shows the symbol as a sticker. Here it is a vinyl one: the official icon on a
  die-cut paper margin, with a holographic sheen. It leans towards the pointer and the light
  moves across it; a click (or Enter / Space) flips it over, and the back signs the site.
  With reduced motion it does not lean and flips without turning.
*/
type Texts = { flip: string; hint: string; found: string; role: string; back: string; newTab: string };
type Credits = { name: string; stack: string; href: string; linkLabel: string };

export function Sticker({ t, credits }: { t: Texts; credits: Credits }) {
  const card = useRef<HTMLButtonElement>(null);
  const [flipped, setFlipped] = useState(false);

  const lean = (event: PointerEvent<HTMLButtonElement>) => {
    const el = card.current;
    if (!el || event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = el.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width, y = (event.clientY - box.top) / box.height;
    el.style.setProperty('--rx', `${(0.5 - y) * 22}deg`);
    el.style.setProperty('--ry', `${(x - 0.5) * 26}deg`);
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
    el.dataset.lean = '';
  };
  const rest = () => {
    const el = card.current;
    if (!el) return;
    el.style.removeProperty('--rx'); el.style.removeProperty('--ry');
    delete el.dataset.lean;
  };

  return <div className="sticker" data-flipped={flipped || undefined}>
    <button ref={card} type="button" className="sticker-card" aria-pressed={flipped} aria-label={flipped ? t.back : t.flip}
      onPointerMove={lean} onPointerLeave={rest} onClick={() => setFlipped(f => !f)}>
      <span className="sticker-turn">
        <span className="sticker-face sticker-front">
          <img src="/brand/symbol-navy.svg" width="632" height="632" alt="" draggable={false} />
          <i className="sticker-holo" />
          <i className="sticker-glare" />
        </span>
        <span className="sticker-face sticker-back" aria-hidden={!flipped}>
          <small>{t.found}</small>
          <b>{credits.name}</b>
          <span>{t.role}</span>
        </span>
      </span>
    </button>
    <p className="sticker-hint">
      {flipped
        ? <a href={credits.href} target="_blank" rel="noopener noreferrer">{credits.name} · {credits.linkLabel}<span className="sr-only"> {t.newTab}</span></a>
        : t.hint}
    </p>
  </div>;
}
