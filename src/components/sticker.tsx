'use client';

import { useEffect, useRef, useState } from 'react';
import type { Peel, StickerRenderer } from '@/lib/sticker/peel';

type Point = { x: number; y: number };
type Texts = { peel: string; found: string; role: string; back: string; newTab: string };
type Credits = { name: string; stack: string; href: string; linkLabel: string };

/*
  Manual p.10 shows the symbol as a sticker with a lifting corner. Here it is one, and it
  behaves like paper with glue under it (drawn in 3D by lib/sticker/peel.ts):

    peeling   grab it by any edge and pull back across it: the paper rolls up (a curl, not a
              crease) and folds over, showing its plain back. The glue resists: the peel front
              creeps and then gives in small jumps, and its line is never perfectly straight.
              Pulling outwards only strains the edge; let go early and it sticks back down.
    off       once the peel front passes the far edge, the sticker is in your hand: it hangs
              from where you hold it and swings with your movement.
    falling   let go and it drops, carried by the throw, turning and tumbling, and the
              signature underneath is found.

  Nothing plays on its own: a plain click only lifts the corner and lets it fall back. The
  keyboard (Enter or Space) peels it in one gesture. Without WebGL, or with reduced motion,
  the official flat sticker is shown and a click takes it off.
*/

const REST = 0.16;      // the resting corner lift, as a share of the side
const HOVER = 0.3;
const GRAVITY = 1900;   // px/s² while it hangs
const FALL = 2600;      // px/s² once dropped

const len = (p: Point) => Math.hypot(p.x, p.y);
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k });
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;

/** Peel state from the grabbed point g and where it has been pulled to (q), both local px. */
function peelOf(g: Point, q: Point, size: number, phase: number): Peel | undefined {
  const d = len(sub(g, q));
  if (d < 0.6) return undefined;
  const n = mul(sub(g, q), 1 / d);
  const r = Math.min(13, Math.max(2.5, d * 0.16)) * size / 132;
  const c = (dot(q, n) + dot(g, n) - Math.PI * r) / 2;
  return { n: [n.x, n.y], c, r, wave: Math.min(1.6, d * 0.05) * size / 132, phase };
}

/** The nearest point on the sticker's edge to p (local px), and the way into the sticker from it. */
function edgeOf(p: Point, half: number) {
  const ax = Math.abs(p.x), ay = Math.abs(p.y);
  const g = ax > ay ? { x: Math.sign(p.x || 1) * half, y: Math.max(-half, Math.min(half, p.y)) } : { x: Math.max(-half, Math.min(half, p.x)), y: Math.sign(p.y || 1) * half };
  // near a corner, peel from the corner itself
  if (Math.abs(Math.abs(g.x) - half) < half * 0.35 && Math.abs(Math.abs(g.y) - half) < half * 0.35) { g.x = Math.sign(g.x) * half; g.y = Math.sign(g.y) * half; }
  const inward = mul(g, -1 / (len(g) || 1));
  return { g, inward };
}

export function Sticker({ t, credits }: { t: Texts; credits: Credits }) {
  const root = useRef<HTMLDivElement>(null);
  const [off, setOff] = useState(false);
  const api = useRef<{ restore: () => void }>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const body = element.querySelector<HTMLButtonElement>('.sticker-body')!;
    const slot = element.querySelector<HTMLElement>('.sticker-slot')!;
    const section = (element.closest('section') as HTMLElement | null) ?? element.parentElement!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hover = window.matchMedia('(hover: hover)');

    let renderer: StickerRenderer | undefined;
    let canvas: HTMLCanvasElement | undefined;
    let disposed = false, frame = 0, last = 0;
    let size = slot.offsetWidth || 132;
    const half = () => size / 2;
    const corner = () => ({ x: half(), y: half() });

    // Stuck (being peeled): grab point, where it is pulled to (target), and what is shown.
    type Mode = 'stuck' | 'held' | 'falling' | 'gone';
    let mode: Mode = 'stuck';
    let g: Point = corner();
    let inward: Point = mul(corner(), -1 / len(corner()));
    let target: Point = sub(g, mul({ x: 1, y: 1 }, REST * size / Math.SQRT2 * 1.4));
    let shown: Point = { ...target };
    let shownVel: Point = { x: 0, y: 0 };
    let phase = 0, nextSlip = 0;
    let drag: { id: number; start: Point; startTarget: Point; moved: boolean } | undefined;
    let tease = 0;

    // Off the page: the sheet is the sticker reflected over its last peel line, hanging from
    // the pointer by the grabbed point; then the fall.
    let hold = { n: { x: 0.7, y: 0.7 }, line: 0, grab: { x: 0, y: 0 } };
    let pointer: Point = { x: 0, y: 0 };     // section px
    let pointerVel: Point = { x: 0, y: 0 };  // px/s, smoothed
    let pointerAcc: Point = { x: 0, y: 0 };
    let angle = 0, spin = 0, flip = 0, flipRate = 0;
    let fallVel: Point = { x: 0, y: 0 };
    let fallStart = 0;

    const sectionBox = () => section.getBoundingClientRect();
    const centre = () => {
      const s = sectionBox(), b = slot.getBoundingClientRect();
      return { x: b.left - s.left + b.width / 2, y: b.top - s.top + b.height / 2 };
    };
    const toLocal = (event: PointerEvent): Point => {
      const b = slot.getBoundingClientRect();
      return { x: event.clientX - b.left - b.width / 2, y: event.clientY - b.top - b.height / 2 };
    };
    const toSection = (event: PointerEvent): Point => {
      const s = sectionBox();
      return { x: event.clientX - s.left, y: event.clientY - s.top };
    };

    /** The affine (local → section px) of the sheet in the hand. */
    const handAffine = (): [number, number, number, number, number, number] => {
      // reflection over the peel line, then turn by `angle` about the held point, then tumble
      const { n, line } = hold;
      const r = [1 - 2 * n.x * n.x, -2 * n.x * n.y, -2 * n.x * n.y, 1 - 2 * n.y * n.y]; // column-major a b c d
      const ro = { x: 2 * line * n.x, y: 2 * line * n.y };
      const cos = Math.cos(angle), sin = Math.sin(angle);
      // tumble: squash along the turned x axis
      const f = Math.cos(flip);
      const rot = [cos * f, sin * f, -sin, cos]; // rotation with x scaled by f
      const m = [rot[0] * r[0] + rot[2] * r[1], rot[1] * r[0] + rot[3] * r[1], rot[0] * r[2] + rot[2] * r[3], rot[1] * r[2] + rot[3] * r[3]];
      const grabbed = add({ x: r[0] * hold.grab.x + r[2] * hold.grab.y, y: r[1] * hold.grab.x + r[3] * hold.grab.y }, ro);
      const turned = { x: rot[0] * grabbed.x + rot[2] * grabbed.y, y: rot[1] * grabbed.x + rot[3] * grabbed.y };
      const shift = { x: rot[0] * ro.x + rot[2] * ro.y, y: rot[1] * ro.x + rot[3] * ro.y };
      return [m[0], m[1], m[2], m[3], pointer.x - turned.x + shift.x, pointer.y - turned.y + shift.y];
    };

    const render = () => {
      if (!renderer) return;
      const c = centre();
      if (mode === 'stuck') renderer.draw({ centre: c, size, peel: peelOf(g, shown, size, phase) });
      else if (mode === 'held') renderer.draw({ centre: c, size, affine: handAffine(), height: 28 });
      else if (mode === 'falling') {
        const age = (performance.now() - fallStart) / 1000;
        renderer.draw({ centre: c, size, affine: handAffine(), height: 28 + age * 40, opacity: Math.max(0, 1 - Math.max(0, age - 0.7) / 0.6) });
      } else renderer.draw({ centre: c, size, affine: [0, 0, 0, 0, -9999, -9999], opacity: 0 });
    };

    /** The resting corner lift (a little more under a hovering mouse). */
    const restTarget = () => sub(corner(), mul({ x: 1, y: 1 }, (hover.matches && body.matches(':hover') ? HOVER : REST) * size / Math.SQRT2 * 1.4));

    const step = (now: number) => {
      frame = 0;
      if (disposed) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      let busy = false;

      if (mode === 'stuck') {
        const tension = sub(target, shown);
        const peeling = len(sub(g, target)) > len(sub(g, shown)) + 0.5;
        if (drag && peeling) {
          // glue: a slow creep, then it gives in a little jump
          shown = add(shown, mul(tension, 1 - Math.exp(-dt * 7)));
          if (now > nextSlip && len(tension) > 3) { shown = add(shown, mul(tension, 0.6)); nextSlip = now + 35 + Math.random() * 70; }
          shownVel = { x: 0, y: 0 };
        } else if (drag) {
          shown = add(shown, mul(tension, 1 - Math.exp(-dt * 30)));
          shownVel = { x: 0, y: 0 };
        } else {
          // let go: paper springs back down onto its glue, with a little bounce
          shownVel = add(shownVel, mul(sub(mul(tension, 260), mul(shownVel, 20)), dt));
          shown = add(shown, mul(shownVel, dt));
        }
        phase += len(tension) * 0.02;
        const peel = peelOf(g, shown, size, phase);
        // the peel front has passed the far edge: the sticker is off, in the hand
        const far = peel ? -(half()) * (Math.abs(peel.n[0]) + Math.abs(peel.n[1])) : 0;
        if (peel && drag && peel.c < far - 2) {
          hold = { n: { x: peel.n[0], y: peel.n[1] }, line: peel.c + Math.PI * peel.r / 2, grab: g };
          mode = 'held'; angle = 0; spin = 0; flip = 0;
          element.dataset.peeled = '';
        }
        busy = Boolean(drag) || len(tension) > 0.3 || len(shownVel) > 2 || now < tease;
        if (!drag && now >= tease && tease) { tease = 0; target = restTarget(); }
      }

      if (mode === 'held' || mode === 'falling') {
        // a pendulum hanging from the held point: gravity, the hand's own acceleration, air
        const pivotToCentre = (() => {
          const a = handAffine();
          return { x: a[4] - pointer.x, y: a[5] - pointer.y };
        })();
        const gravity = mode === 'held' ? { x: -pointerAcc.x, y: GRAVITY - pointerAcc.y } : { x: 0, y: 0 };
        const inertia = dot(pivotToCentre, pivotToCentre) + size * size / 6;
        const torque = pivotToCentre.x * gravity.y - pivotToCentre.y * gravity.x;
        spin += (torque / inertia) * dt;
        spin *= Math.exp(-dt * (mode === 'held' ? 1.6 : 0.6));
        angle += spin * dt;
        if (mode === 'falling') {
          fallVel = { x: fallVel.x * Math.exp(-dt * 0.9), y: fallVel.y * Math.exp(-dt * 0.9) + FALL * dt };
          pointer = add(pointer, mul(fallVel, dt));
          flip += flipRate * dt;
          const age = (now - fallStart) / 1000;
          if (age > 1.35 || pointer.y > sectionBox().height + size * 2) { mode = 'gone'; render(); finish(); return; }
        }
        busy = true;
      }

      render();
      if (busy) frame = requestAnimationFrame(step); else last = 0;
    };
    const request = () => { if (!frame && !disposed && renderer) frame = requestAnimationFrame(step); };

    const finish = () => { delete element.dataset.peeled; setOff(true); };

    // ——— input
    const onEnter = (event: PointerEvent) => { if (event.pointerType === 'mouse' && mode === 'stuck' && !drag) { target = restTarget(); request(); } };
    const onLeave = () => { if (mode === 'stuck' && !drag) { target = restTarget(); request(); } };
    const onDown = (event: PointerEvent) => {
      if (event.button > 0 || mode !== 'stuck' || !renderer) return;
      event.preventDefault();
      body.setPointerCapture(event.pointerId);
      const p = toLocal(event);
      // the fingernail finds the nearest edge; if the corner is already up, take the corner
      const lifted = len(sub(p, shown)) < size * 0.28 || len(sub(p, corner())) < size * 0.3;
      if (lifted) { g = corner(); inward = mul(corner(), -1 / len(corner())); }
      else { const edge = edgeOf(p, half()); g = edge.g; inward = edge.inward; shown = add(g, mul(inward, size * 0.03)); target = { ...shown }; }
      drag = { id: event.pointerId, start: p, startTarget: lifted ? { ...shown } : { ...shown }, moved: false };
      pointer = toSection(event);
      pointerVel = { x: 0, y: 0 }; pointerAcc = { x: 0, y: 0 };
      request();
    };
    let lastMoveAt = 0;
    const onMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const p = toLocal(event);
      if (!drag.moved && len(sub(p, drag.start)) < 3) return;
      drag.moved = true;
      // the hand's speed and acceleration, smoothed (they swing a hanging sticker)
      const now = event.timeStamp, dtm = Math.max(4, now - lastMoveAt) / 1000;
      const next = toSection(event);
      const vel = mul(sub(next, pointer), 1 / dtm);
      const smoothVel = add(mul(pointerVel, 0.6), mul(vel, 0.4));
      pointerAcc = add(mul(pointerAcc, 0.6), mul(sub(smoothVel, pointerVel), 0.4 / dtm));
      pointerVel = smoothVel; pointer = next; lastMoveAt = now;
      if (mode === 'stuck') {
        let pulled = add(drag.startTarget, sub(p, drag.start));
        // only pulling back across the sticker peels it; pulling outwards just strains the edge
        const along = dot(sub(pulled, g), inward);
        if (along < 0) pulled = add(sub(pulled, mul(inward, along)), mul(inward, Math.min(size * 0.06, -along * 0.12)));
        target = pulled;
      }
      request();
    };
    const onUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const moved = drag.moved;
      drag = undefined;
      if (body.hasPointerCapture(event.pointerId)) body.releasePointerCapture(event.pointerId);
      if (mode === 'held') {
        // thrown: it keeps the hand's speed and tumbles as it falls
        mode = 'falling'; fallStart = performance.now();
        fallVel = { x: Math.max(-1600, Math.min(1600, pointerVel.x)), y: Math.max(-1400, Math.min(900, pointerVel.y)) };
        flipRate = (Math.abs(fallVel.x) / 220 + 4) * (fallVel.x < 0 ? -1 : 1);
        spin += fallVel.x / 600;
        request();
        return;
      }
      if (!moved) {
        // a plain click: the corner lifts and falls back, nothing more
        g = corner(); inward = mul(corner(), -1 / len(corner()));
        target = sub(corner(), mul({ x: 1, y: 1 }, 0.42 * size / Math.SQRT2 * 1.4));
        tease = performance.now() + 260;
      } else {
        // let go before it came off: it sticks back down, then the corner settles to rest
        target = { ...g, x: g.x + inward.x * 0.001, y: g.y + inward.y * 0.001 };
        window.setTimeout(() => { if (mode === 'stuck' && !drag) { g = corner(); inward = mul(corner(), -1 / len(corner())); shown = add(g, mul(inward, 1)); target = restTarget(); request(); } }, 420);
      }
      request();
    };

    // Keyboard: Enter or Space peels it in one gesture and lets it fall.
    const onClick = (event: MouseEvent) => {
      // without the 3D sheet (or with reduced motion) any click simply takes it off
      if (!renderer || reduced.matches) { setOff(true); return; }
      if (event.detail !== 0) return; // pointer clicks are handled above
      g = corner(); inward = mul(corner(), -1 / len(corner()));
      const sweep = (k: number) => { target = add(g, mul(inward, size * 2.4 * k)); shown = { ...target }; };
      const start = performance.now();
      const auto = (now: number) => {
        const k = Math.min(1, (now - start) / 650);
        sweep(k * k * (3 - 2 * k));
        const peel = peelOf(g, shown, size, phase);
        render();
        if (peel && peel.c < -half() * (Math.abs(peel.n[0]) + Math.abs(peel.n[1])) - 2) {
          hold = { n: { x: peel.n[0], y: peel.n[1] }, line: peel.c + Math.PI * peel.r / 2, grab: g };
          const c = centre();
          pointer = add(c, shown);
          mode = 'falling'; fallStart = performance.now(); fallVel = { x: 160, y: -240 }; flipRate = 5; spin = 0.6;
          request();
          return;
        }
        requestAnimationFrame(auto);
      };
      requestAnimationFrame(auto);
    };

    body.addEventListener('pointerenter', onEnter);
    body.addEventListener('pointerleave', onLeave);
    body.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    body.addEventListener('click', onClick);
    const noDrag = (event: Event) => event.preventDefault();
    body.addEventListener('dragstart', noDrag);

    // ——— the 3D sheet, loaded when the sticker comes near the screen
    const resize = () => {
      size = slot.offsetWidth || size;
      const s = sectionBox();
      renderer?.resize(s.width, s.height);
      if (mode === 'stuck' && !drag) { g = corner(); inward = mul(corner(), -1 / len(corner())); target = restTarget(); shown = { ...target }; }
      request(); render();
    };
    const load = async () => {
      if (reduced.matches || renderer || disposed) return;
      try {
        const module = await import('@/lib/sticker/peel');
        canvas = document.createElement('canvas');
        canvas.className = 'sticker-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        section.appendChild(canvas);
        const created = await module.createStickerRenderer(canvas);
        if (disposed) { created.dispose(); canvas.remove(); return; }
        renderer = created;
        element.dataset.gl = '';
        resize();
      } catch { canvas?.remove(); canvas = undefined; }
    };
    const near = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { near.disconnect(); load(); } }, { rootMargin: '400px' });
    near.observe(element);
    const resizer = new ResizeObserver(resize);
    resizer.observe(section);

    api.current = {
      restore: () => {
        mode = 'stuck'; drag = undefined;
        g = corner(); inward = mul(corner(), -1 / len(corner()));
        // pressed back on: it arrives lifted and smooths down onto the page
        shown = sub(g, mul({ x: 1, y: 1 }, 0.7 * size));
        shownVel = { x: 0, y: 0 };
        target = restTarget();
        request();
      },
    };
    element.dataset.ready = '';

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      near.disconnect(); resizer.disconnect();
      body.removeEventListener('pointerenter', onEnter);
      body.removeEventListener('pointerleave', onLeave);
      body.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      body.removeEventListener('click', onClick);
      body.removeEventListener('dragstart', noDrag);
      renderer?.dispose();
      canvas?.remove();
    };
  }, []);

  // Focus follows the sticker: to the signature when it comes off, back to it when re-stuck.
  const previous = useRef(off);
  useEffect(() => {
    // only on a real change (effects can run twice in development)
    if (previous.current === off) return;
    previous.current = off;
    const element = root.current;
    if (off) element?.querySelector<HTMLElement>('.sticker-found')?.focus({ preventScroll: true });
    else { element?.querySelector<HTMLElement>('.sticker-body')?.focus({ preventScroll: true }); api.current?.restore(); }
  }, [off]);

  return <div className="sticker" ref={root} data-off={off || undefined}>
    <div className="sticker-slot">
      <span className="sticker-mark" aria-hidden="true" />
      <button type="button" className="sticker-body" aria-label={t.peel} hidden={off}>
        <span className="sticker-flat" aria-hidden="true"><img src="/brand/symbol-light.svg" width="632" height="632" alt="" loading="lazy" draggable={false} /></span>
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
