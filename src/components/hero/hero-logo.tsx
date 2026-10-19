'use client';

import { useEffect, useRef } from 'react';
import type { LogoRenderer, Pose } from '@/lib/logo/renderer';

/*
  01 — The official symbol, spinning in as a physical object.

  Entrance (2.6 s): the tile arrives edge-on and spins in one and a quarter turns, fast at
  first and slowing into place with a small give past the front; it rises and grows as it
  turns, the studio light travels across it, and the dot seats into the C last.
  After: it stays alive while on screen (a slow sway and float, leaning towards the pointer).
  It is a wheel: flick it and it keeps turning for a long time, grab it to stop it in the
  hand, drag to turn it, let go to fling it again; once slow it glides into the nearest face.
  A click on the resting symbol is a drop of ink: the next official colourway spreads over it
  from where the drop landed (renderer.ts), and the symbol gives under the impact and leans
  away from it. The page's theme does not change.

  Until the 3D engine is ready (or without WebGL2, with data saver or on a weak device) the
  official symbol file is shown; it spins in with CSS if the 3D does not arrive. With reduced
  motion the official symbol simply stands there.
*/

const ENTRANCE = 2600;          // ms
const START_SPIN = -2.5 * Math.PI; // edge-on, one and a quarter turns away
const REST = { spin: -0.34, tilt: 0.13 }; // three-quarter resting view: thickness and edge light show
const SHARE = 0.36;             // tile half-size as a share of the stage's short side
const LOAD_BUDGET = 3500;       // ms the engine has before the CSS version plays instead
// Free rotation, in any direction. Angular speeds are in radians per millisecond.
const FRICTION = 9000;          // ms for a free spin to lose about two thirds of its speed
const MAX_SPEED = 0.06;         // about ten turns a second
const SETTLE_SPEED = 0.0007;    // below this it glides back upright, facing the reader
const DRAG = 0.011;             // radians per pixel of drag

/** Quaternions as [x, y, z, w], kept here so the page does not need three.js to hold a pose. */
type Quat = [number, number, number, number];
const IDENTITY: Quat = [0, 0, 0, 1];
const BACK: Quat = [0, 1, 0, 0]; // turned half a turn: the back, which carries the same mark
const qMul = (a: Quat, b: Quat): Quat => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const qNorm = (q: Quat): Quat => { const l = Math.hypot(...q) || 1; return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]; };
/** Rotation by the vector v (axis × angle, radians). */
const qFromVector = (v: [number, number, number]): Quat => {
  const angle = Math.hypot(...v);
  if (angle < 1e-9) return IDENTITY;
  const s = Math.sin(angle / 2) / angle;
  return [v[0] * s, v[1] * s, v[2] * s, Math.cos(angle / 2)];
};
const qDot = (a: Quat, b: Quat) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
function qSlerp(a: Quat, b: Quat, t: number): Quat {
  let d = qDot(a, b);
  const to: Quat = d < 0 ? [-b[0], -b[1], -b[2], -b[3]] : b;
  d = Math.abs(d);
  if (d > 0.9995) return qNorm([a[0] + (to[0] - a[0]) * t, a[1] + (to[1] - a[1]) * t, a[2] + (to[2] - a[2]) * t, a[3] + (to[3] - a[3]) * t]);
  const angle = Math.acos(d), s = Math.sin(angle);
  const wa = Math.sin((1 - t) * angle) / s, wb = Math.sin(t * angle) / s;
  return [a[0] * wa + to[0] * wb, a[1] * wa + to[1] * wb, a[2] * wa + to[2] * wb, a[3] * wa + to[3] * wb];
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const outQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Out with a small give past the target; s sets how far. */
const outBack = (t: number, s: number) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);

/** The entrance at `t` ms. */
function entrance(t: number): Pose {
  const k = clamp(t / ENTRANCE);
  const grow = outCubic(clamp(t / 1500));
  return {
    spin: REST.spin + (START_SPIN - REST.spin) * (1 - outBack(k, 0.22)),
    tilt: { x: 0.42 * (1 - outCubic(k)) + REST.tilt, y: 0 },
    lift: -0.22 * (1 - grow),
    scale: 0.62 + 0.38 * grow,
    dot: outBack(clamp((t - 1650) / 650), 2.2) * (t > 1650 ? 1 : 0),
    sweep: -1.7 * (1 - inOut(clamp(t / 2900))),
  };
}

type Mode = 'waiting' | 'gl' | 'css' | 'still';

export function HeroLogo({ label }: { label: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = root.current;
    if (!stage) return;
    const canvas = stage.querySelector('canvas')!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(pointer: fine)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const isDark = () => document.documentElement.dataset.theme === 'dark';

    let renderer: LogoRenderer | undefined;
    let mode: Mode = 'waiting';
    let disposed = false, inView = true, frame = 0, last = 0, began = 0, budget = 0;
    let box = { width: 1, height: 1 };
    // Hands-on state: an orientation and an angular velocity vector (rad/ms), in screen axes.
    let orient: Quat = IDENTITY, spinVel: [number, number, number] = [0, 0, 0];
    let dragging = false, dragX = 0, dragY = 0, dragMoved = 0, lastMove = 0;
    let caught = false;   // the pointer went down on a turning symbol: that press is a catch, not a click
    let settling = false, settleTo: Quat = IDENTITY; // slow enough to glide back upright
    const speed = () => Math.hypot(...spinVel);
    let lean = { x: 0, y: 0 }, leanTarget = { x: 0, y: 0 };
    let hit = -1, push = { x: 0, y: 0 }; // when and where the last drop landed

    const setMode = (next: Mode) => { mode = next; stage.dataset.mode = next; };
    // Development only: ?logo=1200 freezes the entrance at that moment, for frame review.
    const frozen = process.env.NODE_ENV !== 'production' ? Number(new URLSearchParams(location.search).get('logo') ?? NaN) : NaN;

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      box = { width: rect.width, height: rect.height };
      renderer?.resize(box.width, box.height);
    };
    const placement = () => ({ x: box.width / 2, y: box.height / 2, half: Math.min(stage.clientWidth, stage.clientHeight) * SHARE });

    const tick = (now: number) => {
      frame = 0;
      if (disposed || !renderer || mode !== 'gl') return;
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      const t = Number.isFinite(frozen) ? frozen : now - began;
      const pose = entrance(t);
      const settled = clamp((t - ENTRANCE + 400) / 1200); // life fades in as the entrance ends

      // Free rotation with almost no friction: a flick keeps it turning, in whatever direction it
      // was thrown, for a long time. Once slow, it glides back upright, front or back to the reader.
      if (!dragging) {
        if (!settling && speed() > SETTLE_SPEED) {
          orient = qNorm(qMul(qFromVector([spinVel[0] * dt, spinVel[1] * dt, spinVel[2] * dt]), orient));
          const fade = Math.exp(-dt / FRICTION);
          spinVel = [spinVel[0] * fade, spinVel[1] * fade, spinVel[2] * fade];
        } else {
          if (!settling) {
            settling = true;
            settleTo = Math.abs(qDot(orient, IDENTITY)) >= Math.abs(qDot(orient, BACK)) ? IDENTITY : BACK;
          }
          spinVel = [0, 0, 0];
          orient = qSlerp(orient, settleTo, 1 - Math.exp(-dt / 380));
        }
      }
      const spinning = clamp(speed() / 0.004); // the idle sway gives way while it turns
      const k = 1 - Math.exp(-dt / 180);
      lean = { x: lean.x + (leanTarget.x - lean.x) * k, y: lean.y + (leanTarget.y - lean.y) * k };
      const time = Number.isFinite(frozen) ? 0 : now / 1000;
      const life = settled * (1 - spinning);
      pose.spin += life * Math.sin(time * 0.55) * 0.09;
      pose.orient = orient;
      pose.tilt = { x: pose.tilt.x + settled * (lean.y * 0.2 + Math.sin(time * 0.8 + 1) * 0.025), y: settled * lean.x * 0.28 };
      pose.lift += settled * Math.sin(time * 0.9) * 0.018;
      if (hit >= 0) {
        // the impact: a quick give, and the symbol leans away from where the drop struck
        const k = (now - hit) / 1000;
        pose.scale *= 1 - 0.12 * Math.exp(-k * 5.5) * Math.cos(k * 15);
        const knock = 0.24 * Math.exp(-k * 4.2) * Math.sin(k * 13);
        pose.tilt = { x: pose.tilt.x - push.y * knock, y: pose.tilt.y + push.x * knock };
        if (k > 1.6) hit = -1;
      }
      renderer.draw(placement(), pose);
      if (inView && !document.hidden && !Number.isFinite(frozen)) frame = requestAnimationFrame(tick);
    };
    const request = () => { if (!frame && !disposed && mode === 'gl') { last = 0; frame = requestAnimationFrame(tick); } };

    const playCss = () => { if (mode === 'waiting') setMode('css'); };
    const eligible = () => !connection?.saveData && (navigator.hardwareConcurrency || 4) > 2;
    const load = async () => {
      if (!eligible()) { playCss(); return; }
      try {
        const module = await import('@/lib/logo/renderer');
        if (!module.supportsWebGL2()) { playCss(); return; }
        const created = await module.createLogoRenderer(canvas, {
          dark: isDark(), compact: box.width < 560,
          onLost: () => { renderer?.dispose(); renderer = undefined; setMode('still'); },
        });
        // Late is fine: if the flat symbol is already showing, the 3D takes over from it.
        if (disposed || mode === 'still') { created.dispose(); return; }
        renderer = created;
        clearTimeout(budget);
        measure();
        setMode('gl');
        began = performance.now();
        request();
      } catch { playCss(); }
    };

    // Pointer: lean towards it; grab it to stop it; drag sideways to turn it; let go to fling it.
    const onMove = (event: PointerEvent) => {
      if (mode !== 'gl') return;
      if (dragging) {
        // the surface follows the hand: dragging right turns it about the vertical axis, down
        // about the horizontal one, diagonally about the axis in between
        const dx = event.clientX - dragX, dy = event.clientY - dragY;
        dragX = event.clientX; dragY = event.clientY;
        dragMoved += Math.hypot(dx, dy);
        const turn: [number, number, number] = [dy * DRAG, dx * DRAG, 0];
        orient = qNorm(qMul(qFromVector(turn), orient));
        const dt = Math.max(8, event.timeStamp - lastMove);
        // smoothed hand speed, so a fling carries the speed of the last few moves
        let next: [number, number, number] = [spinVel[0] * 0.4 + (turn[0] / dt) * 0.6, spinVel[1] * 0.4 + (turn[1] / dt) * 0.6, 0];
        const fast = Math.hypot(...next);
        if (fast > MAX_SPEED) next = [next[0] / fast * MAX_SPEED, next[1] / fast * MAX_SPEED, 0];
        spinVel = next;
        lastMove = event.timeStamp;
        return;
      }
      if (!fine.matches || !inView) return;
      leanTarget = { x: (event.clientX / window.innerWidth) * 2 - 1, y: (event.clientY / window.innerHeight) * 2 - 1 };
    };
    const onDown = (event: PointerEvent) => {
      if (mode !== 'gl' || event.button !== 0) return;
      // no native image drag or text selection: the press belongs to the wheel
      event.preventDefault();
      // grabbing a turning wheel stops it in the hand
      caught = speed() > 0.0015 && !settling;
      dragging = true; dragX = event.clientX; dragY = event.clientY; dragMoved = 0; lastMove = event.timeStamp; spinVel = [0, 0, 0]; settling = false;
      stage.setPointerCapture(event.pointerId);
      stage.dataset.dragging = '';
    };
    const onUp = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      delete stage.dataset.dragging;
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
      if (event.timeStamp - lastMove > 90) spinVel = [0, 0, 0]; // held still before letting go
      settling = false;
      if (dragMoved < 4 && !caught && renderer && performance.now() - began > ENTRANCE * 0.8) {
        // a click on a resting symbol: a drop of ink lands where the pointer is
        const rect = canvas.getBoundingClientRect();
        const landed = renderer.splash(event.clientX - rect.left, event.clientY - rect.top);
        if (landed) { hit = performance.now(); push = landed; }
      }
      caught = false;
    };

    const onTheme = () => { renderer?.setTheme(isDark()); request(); };
    const onVisibility = () => { if (!document.hidden) request(); };
    const onPreference = () => {
      if (!reduced.matches) return;
      renderer?.dispose(); renderer = undefined;
      cancelAnimationFrame(frame); frame = 0;
      setMode('still');
    };

    const visibility = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) request(); else leanTarget = { x: 0, y: 0 };
    });
    visibility.observe(stage);
    const resizer = new ResizeObserver(() => { measure(); request(); });
    resizer.observe(stage);
    measure();

    let idle = 0;
    if (reduced.matches) setMode('still');
    else {
      setMode('waiting');
      idle = window.setTimeout(load, 0);
      budget = window.setTimeout(playCss, LOAD_BUDGET);
    }
    stage.dataset.ready = '';

    window.addEventListener('pointermove', onMove, { passive: true });
    stage.addEventListener('pointerdown', onDown);
    const noDrag = (event: Event) => event.preventDefault();
    stage.addEventListener('dragstart', noDrag);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('themechange', onTheme);
    document.addEventListener('visibilitychange', onVisibility);
    reduced.addEventListener('change', onPreference);

    return () => {
      disposed = true;
      clearTimeout(idle); clearTimeout(budget);
      cancelAnimationFrame(frame);
      visibility.disconnect(); resizer.disconnect();
      window.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('dragstart', noDrag);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('themechange', onTheme);
      document.removeEventListener('visibilitychange', onVisibility);
      reduced.removeEventListener('change', onPreference);
      renderer?.dispose();
    };
  }, []);

  return <div className="hero-logo" ref={root} role="img" aria-label={label}>
    {/* The official symbol files, never redrawn: shown before (or instead of) the 3D. */}
    <span className="hero-symbol" aria-hidden="true">
      <img className="for-light" src="/brand/symbol-navy.svg" width="632" height="632" alt="" draggable={false} />
      <span className="for-dark"><img src="/brand/logo-light.svg" width="1408" height="311" alt="" draggable={false} /></span>
    </span>
    <canvas className="hero-canvas" aria-hidden="true" />
  </div>;
}
