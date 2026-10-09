'use client';

import { useEffect, useRef } from 'react';
import { applyTheme, currentTheme, otherTheme, saveTheme, startViewTransition, type Theme } from '@/lib/theme';

type Point = { x: number; y: number };

const COMMIT = 0.55;   // pulled past this share of the width, the page turns over
const FLICK = 900;     // px/s towards the left also turns it
const SHADOW = 90;     // px of shade the lifted page casts on the page underneath

/*
  Pull the page by its edge to switch theme: the page peels like the sticker (manual p.10)
  and the site underneath is already in the other theme.

  Same flat-paper geometry as the sticker: the crease is the perpendicular bisector between
  the grabbed edge point and the pointer. Where the browser has View Transitions, the old
  page is the transition's snapshot and the new theme is the live page, shown only inside the
  revealed area and the flap (a clip on ::view-transition-new(root)); the flap itself and the
  shade under it are real elements of the new page. Without View Transitions, the revealed
  area shows the other theme's surface instead. Let go past the middle (or flick) and it
  turns over; otherwise it lies back down and nothing changes.
*/
export function ThemePeel({ label }: { label: string }) {
  const tab = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handle = tab.current;
    if (!handle) return;
    const root = document.documentElement;
    const flap = document.querySelector<HTMLElement>('.peel-flap')!;
    const shade = document.querySelector<HTMLElement>('.peel-shade')!;
    const under = document.querySelector<HTMLElement>('.peel-under')!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    let w = innerWidth, h = innerHeight;
    let corner: Point = { x: w, y: h / 2 };
    let pointer: Point = { ...corner };
    let target: Point = { ...corner };
    let from: Theme = 'light', to: Theme = 'dark';
    let mode: 'idle' | 'armed' | 'peeling' | 'settling' = 'idle';
    let transition: ReturnType<typeof startViewTransition> = null;
    let live = false; // the new page is showing through the clip
    let frame = 0, last = 0, outcome: 'commit' | 'cancel' | null = null;
    let drag: { id: number; start: Point; speed: number; at: number; prevX: number } | undefined;

    const fmt = (p: Point) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`;
    /** The viewport clipped to one side of the line through m with normal n. */
    const half = (m: Point, n: Point, keep: 1 | -1) => {
      const box = [{ x: -2, y: -2 }, { x: w + 2, y: -2 }, { x: w + 2, y: h + 2 }, { x: -2, y: h + 2 }];
      const side = (p: Point) => keep * ((p.x - m.x) * n.x + (p.y - m.y) * n.y);
      const out: Point[] = [];
      box.forEach((a, i) => {
        const b = box[(i + 1) % 4], da = side(a), db = side(b);
        if (da >= 0) out.push(a);
        if (da * db < 0) { const k = da / (da - db); out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }); }
      });
      return out;
    };
    const polygon = (points: Point[]) => points.length > 2 ? `polygon(${points.map(fmt).join(',')})` : 'polygon(0 0, 0 0, 0 0)';
    const subpath = (points: Point[]) => points.length > 2 ? `M${points.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L')}Z` : '';

    const draw = () => {
      const dx = corner.x - pointer.x, dy = corner.y - pointer.y;
      const length = Math.hypot(dx, dy);
      if (length < 0.5) { root.style.setProperty('--peel-clip', 'path("M0 0Z")'); for (const el of [flap, shade, under]) el.style.clipPath = 'polygon(0 0, 0 0, 0 0)'; return; }
      const n = { x: dx / length, y: dy / length };
      const m = { x: (corner.x + pointer.x) / 2, y: (corner.y + pointer.y) / 2 };
      const revealed = half(m, n, 1);
      // The lifted part of the old page, folded back across the crease: its paper back.
      const folded = revealed.map(p => { const d = 2 * ((p.x - m.x) * n.x + (p.y - m.y) * n.y); return { x: p.x - d * n.x, y: p.y - d * n.y }; });
      root.style.setProperty('--peel-clip', `path("${subpath(revealed)}${subpath(folded)}")`);
      flap.style.clipPath = polygon(folded);
      shade.style.clipPath = polygon(revealed);
      under.style.clipPath = polygon(revealed);
      // Gradients run along n across the whole viewport box (CSS: through the centre, length
      // w·|nx| + h·|ny|); place the crease, the flap's tip and the end of the shade on it.
      const span = w * Math.abs(n.x) + h * Math.abs(n.y);
      const at = (((m.x - w / 2) * n.x + (m.y - h / 2) * n.y) / span + 0.5) * 100;
      const angle = `${(Math.atan2(n.x, -n.y) * 180 / Math.PI).toFixed(2)}deg`;
      for (const el of [flap, shade]) {
        el.style.setProperty('--angle', angle);
        el.style.setProperty('--crease', `${at.toFixed(3)}%`);
      }
      flap.style.setProperty('--tip', `${(at - (length / 2) / span * 100).toFixed(3)}%`);
      shade.style.setProperty('--fade', `${(at + SHADOW / span * 100).toFixed(3)}%`);
    };

    const finish = () => {
      // Hide the peel elements and drop the snapshot in the same task: the next paint is
      // simply the page, in whichever theme it ended.
      if (outcome === 'cancel') applyTheme(from); else saveTheme(to);
      delete root.dataset.peel;
      delete root.dataset.peelLive;
      transition?.skipTransition();
      transition = null; live = false; mode = 'idle'; outcome = null;
      pointer = target = { ...corner };
      draw();
      handle.focus({ preventScroll: true });
    };

    const step = (now: number) => {
      frame = 0;
      const s = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      // Follows the pointer closely; settling, it eases to its end like paper laid down.
      const k = 1 - Math.exp(-s * (mode === 'settling' ? (outcome === 'commit' ? 7 : 11) : 30));
      pointer = { x: pointer.x + (target.x - pointer.x) * k, y: pointer.y + (target.y - pointer.y) * k };
      if (live || !transition) draw();
      const gap = Math.hypot(target.x - pointer.x, target.y - pointer.y);
      // Turning over is done once the new page covers every corner of the screen.
      const covered = () => {
        const n = { x: corner.x - pointer.x, y: corner.y - pointer.y }, m = { x: (corner.x + pointer.x) / 2, y: (corner.y + pointer.y) / 2 };
        return [[0, 0], [w, 0], [0, h], [w, h]].every(([x, y]) => (x - m.x) * n.x + (y - m.y) * n.y > 0);
      };
      if (mode === 'settling' && (gap < 1.5 || (outcome === 'commit' && covered()))) { last = 0; finish(); return; }
      if (mode !== 'idle') frame = requestAnimationFrame(step);
      else last = 0;
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(step); };

    const begin = (y: number) => {
      w = innerWidth; h = innerHeight;
      corner = { x: w, y };
      pointer = target = { ...corner };
      from = currentTheme(); to = otherTheme(from);
      flap.dataset.from = from; // the back of the page being lifted is the old theme's paper
      mode = 'peeling';
      root.dataset.peel = 'true';
      draw();
      transition = startViewTransition(() => { applyTheme(to); root.dataset.peelLive = 'vt'; });
      if (transition) {
        transition.ready.then(() => { live = true; draw(); }).catch(() => { transition = null; root.dataset.peelLive = 'flat'; });
      } else {
        // No View Transitions: the other theme's surface shows through instead.
        root.dataset.peelLive = 'flat';
        under.style.background = to === 'dark' ? 'var(--ink)' : 'var(--off-white)';
      }
      request();
    };
    const settle = (result: 'commit' | 'cancel') => {
      outcome = result;
      mode = 'settling';
      // Turning over: the edge travels past the far side so the whole page is the new one.
      target = result === 'commit' ? { x: -w * 1.08, y: corner.y + (target.y - corner.y) * 1.4 } : { ...corner };
      request();
    };

    const onDown = (event: PointerEvent) => {
      if (event.button > 0 || mode !== 'idle') return;
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      drag = { id: event.pointerId, start: { x: event.clientX, y: event.clientY }, speed: 0, at: event.timeStamp, prevX: event.clientX };
      mode = 'armed';
    };
    const onMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      if (mode === 'armed') {
        if (Math.hypot(event.clientX - drag.start.x, event.clientY - drag.start.y) < 5) return;
        if (reduced.matches) return;
        begin(drag.start.y);
      }
      if (mode !== 'peeling') return;
      // The edge follows the pointer from wherever the tab was grabbed.
      const offset = innerWidth - drag.start.x;
      target = { x: Math.min(corner.x, event.clientX + offset), y: event.clientY };
      const dt = Math.max(1, event.timeStamp - drag.at) / 1000;
      drag.speed = drag.speed * 0.6 + ((drag.prevX - event.clientX) / dt) * 0.4;
      drag.prevX = event.clientX; drag.at = event.timeStamp;
      request();
    };
    const onUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const { speed, at } = drag;
      drag = undefined;
      if (mode === 'armed') { mode = 'idle'; return; } // a click: handled by onClick
      if (mode !== 'peeling') return;
      const pulled = (corner.x - target.x) / w;
      const flicked = speed > FLICK && event.timeStamp - at < 90 && pulled > 0.12;
      settle(pulled > COMMIT || flicked ? 'commit' : 'cancel');
    };
    // A click, Enter or Space turns the page over by itself, pulled from the tab.
    const onClick = () => {
      if (mode !== 'idle') return;
      if (reduced.matches) { const next = otherTheme(currentTheme()); applyTheme(next); saveTheme(next); return; }
      const box = handle.getBoundingClientRect();
      begin(box.top + box.height / 2);
      target = { x: corner.x - w * 0.12, y: corner.y - h * 0.04 };
      window.setTimeout(() => { if (mode === 'peeling') settle('commit'); }, 160);
    };
    const onResize = () => { if (mode === 'idle') { w = innerWidth; h = innerHeight; } };

    handle.addEventListener('pointerdown', onDown);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
    handle.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      handle.removeEventListener('pointerdown', onDown);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      handle.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      transition?.skipTransition();
      delete root.dataset.peel;
      delete root.dataset.peelLive;
    };
  }, []);

  return <>
    {/* The pull-tab: the other theme peeking from under the page's edge, with the meeting point. */}
    <button ref={tab} type="button" className="peel-tab" aria-label={label} title={label}>
      <span className="peel-tab-point" aria-hidden="true" />
    </button>
    {/* Only drawn while peeling: the other surface (fallback), the shade, the paper back. */}
    <div className="peel-under" aria-hidden="true" />
    <div className="peel-shade" aria-hidden="true" />
    <div className="peel-flap" aria-hidden="true" />
  </>;
}
