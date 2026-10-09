'use client';

import { useEffect, useRef, useState } from 'react';

type Point = { x: number; y: number };
type Texts = { peel: string; found: string; role: string; back: string; newTab: string };
type Credits = { name: string; stack: string; href: string; linkLabel: string };

// Corner lift as a share of the side. The rounded corner hides anything under ~0.2, and at
// rest the fold stops short of the C's dot: the mark is whole until someone touches it.
const REST = 0.26;
const HOVER = 0.46;
const LOOSE = 1.05;   // pulled past this share of the side, the sticker comes off
const FLICK = 900;    // px/s away from the corner: a quick flick also takes it off

/*
  Manual p.10 shows the symbol as a sticker with a lifting corner. Here it is one: the
  official icon (unchanged file) on a die-cut paper margin, upright, and the bottom-right
  corner can be peeled with the pointer or a finger. Peel it off and the signature
  underneath shows.

  The fold is exact flat-paper geometry: the crease is the perpendicular bisector between
  the corner and the pointer; the front is clipped on one side of it and the flap is the
  same sticker reflected across it, showing its paper back. Two clip-paths and a matrix per
  frame, no canvas. Coming off, it folds along the diagonal (the mark is then fully covered
  by its own back) and drops; it never turns the mark (manual p.21).
*/
export function Sticker({ t, credits }: { t: Texts; credits: Credits }) {
  const root = useRef<HTMLDivElement>(null);
  const [off, setOff] = useState(false);
  const api = useRef<{ restore: () => void }>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const body = element.querySelector<HTMLButtonElement>('.sticker-body')!;
    const front = element.querySelector<HTMLElement>('.sticker-front')!;
    const flap = element.querySelector<HTMLElement>('.sticker-flap')!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hover = window.matchMedia('(hover: hover)');

    let size = body.offsetWidth || 96;
    let corner: Point = { x: size, y: size };
    let pointer: Point = { x: size * (1 - REST), y: size * (1 - REST) };
    let target: Point = { ...pointer };
    let velocity: Point = { x: 0, y: 0 };
    let frame = 0, last = 0;
    let drag: { id: number; start: Point; moved: boolean; speed: number; at: number; prev: Point } | undefined;
    let leaving = false, touched = false, suppressClick = false;

    /** The square, clipped to one side of the line through m with normal n. */
    const half = (m: Point, n: Point, keep: 1 | -1) => {
      const pad = 2, s = size;
      const square = [{ x: -pad, y: -pad }, { x: s + pad, y: -pad }, { x: s + pad, y: s + pad }, { x: -pad, y: s + pad }];
      const side = (p: Point) => keep * ((p.x - m.x) * n.x + (p.y - m.y) * n.y);
      const out: Point[] = [];
      square.forEach((a, i) => {
        const b = square[(i + 1) % 4], da = side(a), db = side(b);
        if (da >= 0) out.push(a);
        if (da * db < 0) { const k = da / (da - db); out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }); }
      });
      return out.length > 2 ? `polygon(${out.map(p => `${p.x.toFixed(2)}px ${p.y.toFixed(2)}px`).join(',')})` : 'polygon(0 0, 0 0, 0 0)';
    };

    const draw = () => {
      const dx = corner.x - pointer.x, dy = corner.y - pointer.y;
      const length = Math.hypot(dx, dy);
      if (length < 0.5) { front.style.clipPath = ''; flap.style.visibility = 'hidden'; element.style.setProperty('--lift', '0'); return; }
      const n = { x: dx / length, y: dy / length };
      const m = { x: (corner.x + pointer.x) / 2, y: (corner.y + pointer.y) / 2 };
      front.style.clipPath = half(m, n, -1);
      flap.style.visibility = 'visible';
      flap.style.clipPath = half(m, n, 1);
      // Reflection across the crease: x' = x − 2((x − m)·n)n.
      const d = 2 * (m.x * n.x + m.y * n.y);
      flap.style.transform = `matrix(${1 - 2 * n.x * n.x},${-2 * n.x * n.y},${-2 * n.x * n.y},${1 - 2 * n.y * n.y},${d * n.x},${d * n.y})`;
      // The back is shaded from the crease, where the paper curls away from the light, to
      // its tip. The gradient runs along n in the flap's own (unreflected) box.
      flap.style.setProperty('--crease', `${(Math.atan2(n.x, -n.y) * 180 / Math.PI).toFixed(1)}deg`);
      // Where the crease falls on that gradient line (CSS: through the centre, length
      // s·(|nx| + |ny|) for a square box).
      const along = ((m.x - size / 2) * n.x + (m.y - size / 2) * n.y) / (size * (Math.abs(n.x) + Math.abs(n.y))) + 0.5;
      flap.style.setProperty('--crease-at', `${(along * 100).toFixed(2)}%`);
      element.style.setProperty('--lift', Math.min(1, length / size).toFixed(3));
    };

    const step = (now: number) => {
      frame = 0;
      const s = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      if (drag) {
        // The paper follows the finger closely but not rigidly.
        const k = 1 - Math.exp(-s * 38);
        pointer = { x: pointer.x + (target.x - pointer.x) * k, y: pointer.y + (target.y - pointer.y) * k };
        velocity = { x: 0, y: 0 };
      } else {
        // Paper springs back flat with a small bounce; coming off, it folds through firmly.
        const stiff = leaving ? 160 : 240, damp = leaving ? 20 : 19;
        velocity = { x: velocity.x + (stiff * (target.x - pointer.x) - damp * velocity.x) * s, y: velocity.y + (stiff * (target.y - pointer.y) - damp * velocity.y) * s };
        pointer = { x: pointer.x + velocity.x * s, y: pointer.y + velocity.y * s };
      }
      draw();
      const gap = Math.hypot(target.x - pointer.x, target.y - pointer.y);
      if (leaving && gap < size * 0.04) { pointer = { ...target }; draw(); last = 0; fall(); return; }
      const settled = gap < 0.3 && Math.hypot(velocity.x, velocity.y) < 2;
      if (!settled || drag) frame = requestAnimationFrame(step);
      else { pointer = { ...target }; draw(); last = 0; }
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(step); };
    const aim = (lift: number) => { target = { x: corner.x - lift * size, y: corner.y - lift * size }; request(); };

    const local = (event: PointerEvent): Point => {
      const box = body.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    };

    // Folded on its diagonal, the back covers the mark exactly; then the loose sticker drops.
    const fall = () => {
      const done = () => { body.removeEventListener('animationend', done); delete element.dataset.falling; leaving = false; setOff(true); };
      body.addEventListener('animationend', done);
      element.dataset.falling = 'true';
    };
    const comeOff = () => {
      if (leaving) return;
      leaving = touched = true;
      drag = undefined;
      if (reduced.matches) { leaving = false; setOff(true); return; }
      target = { x: 0, y: 0 };
      request();
    };

    const onEnter = (event: PointerEvent) => { if (event.pointerType === 'mouse' && !drag && !leaving) aim(HOVER); };
    const onLeave = () => { if (!drag && !leaving) aim(REST); };
    const onDown = (event: PointerEvent) => {
      if (event.button > 0 || leaving) return;
      body.setPointerCapture(event.pointerId);
      const p = local(event);
      drag = { id: event.pointerId, start: p, moved: false, speed: 0, at: event.timeStamp, prev: p };
      touched = true;
    };
    const onMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const p = local(event);
      if (!drag.moved && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) < 4) return;
      drag.moved = true;
      // The corner follows the pointer, offset by wherever the sticker was grabbed.
      const reach = size * 2.2;
      let x = p.x + corner.x - drag.start.x - REST * size, y = p.y + corner.y - drag.start.y - REST * size;
      const away = Math.hypot(corner.x - x, corner.y - y);
      if (away > reach) { x = corner.x + (x - corner.x) * reach / away; y = corner.y + (y - corner.y) * reach / away; }
      // Speed away from the corner, smoothed: a flick peels it off.
      const dt = Math.max(1, event.timeStamp - drag.at) / 1000;
      const outward = ((drag.prev.x - p.x) + (drag.prev.y - p.y)) / Math.SQRT2 / dt;
      drag.speed = drag.speed * 0.6 + outward * 0.4;
      drag.prev = p; drag.at = event.timeStamp;
      target = { x, y };
      request();
    };
    const onUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const { moved, speed, at } = drag;
      drag = undefined;
      if (!moved) return; // a plain click or tap: handled by onClick
      suppressClick = true;
      const pulled = Math.hypot(corner.x - target.x, corner.y - target.y) / size;
      const flicked = speed > FLICK && event.timeStamp - at < 80 && pulled > 0.35;
      if (pulled > LOOSE || flicked) comeOff();
      else aim(body.matches(':hover') && hover.matches ? HOVER : REST);
    };
    const onClick = () => {
      if (suppressClick) { suppressClick = false; return; }
      comeOff(); // a click or tap without a drag, or Enter / Space
    };

    // Once, when it first comes into view: the corner lifts and settles, so it reads as loose.
    const hint = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      hint.disconnect();
      if (reduced.matches) return;
      window.setTimeout(() => { if (touched) return; aim(0.44); window.setTimeout(() => { if (!touched) aim(REST); }, 420); }, 700);
    }, { threshold: 0.9 });
    hint.observe(body);

    const onResize = () => { if (!body.offsetWidth) return; size = body.offsetWidth; corner = { x: size, y: size }; aim(REST); };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(body);

    body.addEventListener('pointerenter', onEnter);
    body.addEventListener('pointerleave', onLeave);
    body.addEventListener('pointerdown', onDown);
    body.addEventListener('pointermove', onMove);
    body.addEventListener('pointerup', onUp);
    body.addEventListener('pointercancel', onUp);
    body.addEventListener('click', onClick);
    api.current = {
      // Pressed back on: it starts a little lifted and smooths down onto the page.
      restore: () => {
        leaving = false; drag = undefined; velocity = { x: 0, y: 0 };
        pointer = { x: corner.x - size * 0.55, y: corner.y - size * 0.55 };
        draw();
        if (!reduced.matches) {
          element.dataset.pressing = 'true';
          window.setTimeout(() => { delete element.dataset.pressing; }, 520);
        }
        aim(REST);
      },
    };
    draw();
    element.dataset.ready = 'true';

    return () => {
      cancelAnimationFrame(frame);
      hint.disconnect();
      resizeObserver.disconnect();
      body.removeEventListener('pointerenter', onEnter);
      body.removeEventListener('pointerleave', onLeave);
      body.removeEventListener('pointerdown', onDown);
      body.removeEventListener('pointermove', onMove);
      body.removeEventListener('pointerup', onUp);
      body.removeEventListener('pointercancel', onUp);
      body.removeEventListener('click', onClick);
    };
  }, []);

  // Focus follows the sticker: to the signature when it comes off, back to it when re-stuck.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const element = root.current;
    if (off) element?.querySelector<HTMLElement>('.sticker-found')?.focus({ preventScroll: true });
    else { element?.querySelector<HTMLElement>('.sticker-body')?.focus({ preventScroll: true }); api.current?.restore(); }
  }, [off]);

  return <div className="sticker" ref={root} data-off={off || undefined}>
    <div className="sticker-slot">
      <span className="sticker-mark" aria-hidden="true" />
      <button type="button" className="sticker-body" aria-label={t.peel} hidden={off}>
        <span className="sticker-shadow" aria-hidden="true">
          <span className="sticker-front"><img src="/brand/symbol-light.svg" width="632" height="632" alt="" loading="lazy" draggable={false} /></span>
        </span>
        <span className="sticker-flap-shadow" aria-hidden="true"><span className="sticker-flap" /></span>
      </button>
    </div>
    <div className="sticker-credits" aria-live="polite">
      {off && <>
        <p className="sticker-found" tabIndex={-1}><span className="point" aria-hidden="true" />{t.found}</p>
        <p className="sticker-name">{credits.name}</p>
        <p className="sticker-role">{t.role}</p>
        <p className="sticker-stack">{credits.stack}</p>
        <p className="sticker-links">
          <a href={credits.href} target="_blank" rel="noopener noreferrer">{credits.linkLabel}<span className="sr-only"> {t.newTab}</span></a>
          <button type="button" onClick={() => setOff(false)}>{t.back}</button>
        </p>
      </>}
    </div>
  </div>;
}
