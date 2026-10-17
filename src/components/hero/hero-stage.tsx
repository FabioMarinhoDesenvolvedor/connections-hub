'use client';

import { useEffect, useRef } from 'react';
import { SYMBOL } from '@/lib/hero/geometry';
import type { StoryRenderer } from '@/lib/hero/renderer';
import { ARCS, MARK, arcPath, orbitAt } from '@/lib/hero/orbits';
import { BEATS, INTRO, introAt, range, smooth, type Placement } from '@/lib/hero/timeline';

const FALLBACK_UNIT = 100; // px per world unit in the fallback SVG's untransformed box
// Fallback colours are theme tokens (see .hero-fallback in globals.css).
const FALLBACK_COLOURS = { navy: 'var(--story-arc-navy)', orange: 'var(--orange)', sand: 'var(--sand)', paper: 'var(--off-white)' };
// Flat snapshots of the same choreography, for the moments before (or without) WebGL.
const OPEN = orbitAt(0.4).arcs;
const LOCKED = orbitAt(0.58).arcs;

const SHARE = 0.32;        // tile half-size as a share of the stage's short side
const LOAD_BUDGET = 4500;  // ms the 3D engine has to get ready before the flat version plays instead

type Mode = 'waiting' | 'gl' | 'flat' | 'still';

/*
  Plays the opening on its own, once, as soon as the page is up. The 3D engine loads right
  away; while it loads the flat seed stands in, and if it is not ready in time (or
  WebGL2 is missing, data saver is on, the device is weak) the same choreography plays flat.
  With reduced motion the finished symbol is shown still. Clicking the symbol plays it again.
  Frames are requested only while the intro runs, on resize, theme change or pointer tilt.
*/
export function HeroStage() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = root.current;
    if (!stage) return;
    const canvas = stage.querySelector('canvas')!;
    const fallback = stage.querySelector<SVGSVGElement>('.hero-fallback')!;
    const states = [...fallback.querySelectorAll<SVGGElement>('[data-state]')];
    const symbol = stage.querySelector<HTMLElement>('.hero-symbol')!;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(pointer: fine)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const isDark = () => document.documentElement.dataset.theme === 'dark';

    let renderer: StoryRenderer | undefined;
    let mode: Mode = 'waiting';
    let start = 0;
    let box = { width: 1, height: 1 };
    let tilt = { x: 0, y: 0 }, tiltTarget = { x: 0, y: 0 };
    let frame = 0, lastTime = 0;
    let inView = true, disposed = false;
    let budget = 0;

    const setMode = (next: Mode) => { mode = next; stage.dataset.mode = next; };

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      box = { width: rect.width, height: rect.height };
      renderer?.resize(box.width, box.height);
      // The still symbol is sized like the 3D tile, so every version lands in the same place.
      const half = Math.min(stage.clientWidth, stage.clientHeight) * SHARE;
      symbol.style.width = `${(2 * half).toFixed(1)}px`;
    };

    const placement = (): Placement => {
      const half = Math.min(stage.clientWidth, stage.clientHeight) * SHARE;
      return { x: box.width / 2, y: box.height / 2, scale: half / SYMBOL.tileHalf };
    };

    const apply = (now: number) => {
      if (mode === 'still') { symbol.style.opacity = '1'; return true; }
      const intro = mode === 'waiting' ? { p: INTRO.from, done: false } : introAt(now - start);
      const where = placement();

      if (mode === 'gl' && renderer) {
        renderer.draw({ placement: where, state: orbitAt(intro.p, tilt), visible: inView });
        return intro.done;
      }
      // Flat: the concept states cross-fade on the same path, ending on the official symbol.
      fallback.style.transform = `translate3d(${where.x - 2 * FALLBACK_UNIT}px, ${where.y - 2 * FALLBACK_UNIT}px, 0) scale(${where.scale / FALLBACK_UNIT})`;
      const open = smooth(range(intro.p, ...BEATS.release)), locked = smooth(range(intro.p, ...BEATS.lock));
      const hub = smooth(range(intro.p, ...BEATS.hub));
      const weights = [1 - open, open * (1 - locked), locked * (1 - hub)];
      states.forEach((state, i) => { state.style.opacity = String(weights[i]); });
      symbol.style.opacity = String(hub);
      fallback.style.visibility = hub >= 1 ? 'hidden' : '';
      return intro.done;
    };

    const tick = (now: number) => {
      frame = 0;
      if (disposed) return;
      const dt = lastTime ? Math.min(64, now - lastTime) : 16;
      lastTime = now;
      const k = 1 - Math.exp(-dt / 160);
      tilt = { x: tilt.x + (tiltTarget.x - tilt.x) * k, y: tilt.y + (tiltTarget.y - tilt.y) * k };
      const done = apply(now);
      const tilting = Math.abs(tiltTarget.x - tilt.x) + Math.abs(tiltTarget.y - tilt.y) > 1e-3;
      if ((!done && mode !== 'waiting') || tilting) frame = requestAnimationFrame(tick);
      else {
        lastTime = 0;
        if (renderer) Object.assign(stage.dataset, { frames: renderer.stats.frames, scale: renderer.stats.scale.toFixed(2), gpu: renderer.stats.gpu });
      }
    };
    const request = () => { if (!frame && !disposed) frame = requestAnimationFrame(tick); };

    const play = (next: Mode) => {
      clearTimeout(budget);
      setMode(next);
      start = performance.now();
      request();
    };

    const eligible = () => !connection?.saveData && (navigator.hardwareConcurrency || 4) > 2;
    const load = async () => {
      if (!eligible()) { play('flat'); return; }
      try {
        const module = await import('@/lib/hero/renderer');
        if (!module.supportsWebGL2()) { if (mode === 'waiting') play('flat'); return; }
        const created = await module.createStoryRenderer(canvas, {
          compact: box.width < 640,
          dark: isDark(),
          onLost: () => { renderer?.dispose(); renderer = undefined; stage.dataset.gl = 'lost'; setMode('still'); symbol.style.opacity = '1'; },
        });
        // Too late (the flat version already played) or gone: keep what is on screen.
        if (disposed || mode !== 'waiting') { created.dispose(); return; }
        renderer = created;
        measure();
        stage.dataset.gl = 'on';
        play('gl');
        window.dispatchEvent(new CustomEvent('story:renderer', { detail: module.describe(canvas) }));
      } catch { stage.dataset.gl = 'off'; if (mode === 'waiting') play('flat'); }
    };

    const onPointer = (event: PointerEvent) => {
      if (!inView || !fine.matches || mode !== 'gl') return;
      tiltTarget = { x: (event.clientX / window.innerWidth) * 2 - 1, y: (event.clientY / window.innerHeight) * 2 - 1 };
      request();
    };
    // The finished symbol plays the intro again when clicked.
    const onReplay = () => {
      if (mode !== 'gl' && mode !== 'flat') return;
      if (!introAt(performance.now() - start).done) return;
      play(mode);
    };
    const onTheme = () => { renderer?.setTheme(isDark()); request(); };
    const onResize = () => { measure(); request(); };
    const onPreference = () => {
      if (!reduced.matches) return;
      renderer?.dispose(); renderer = undefined; stage.dataset.gl = 'off';
      setMode('still'); symbol.style.opacity = '1'; cancelAnimationFrame(frame); frame = 0;
    };

    const visibility = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (!inView) tiltTarget = tilt = { x: 0, y: 0 };
      request();
    });
    visibility.observe(stage);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(stage);
    measure();

    let idle = 0;
    const begin = () => {
      idle = typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(() => load(), { timeout: 200 }) : window.setTimeout(load, 0);
      budget = window.setTimeout(() => { if (mode === 'waiting') play('flat'); }, LOAD_BUDGET);
    };
    if (reduced.matches) { setMode('still'); symbol.style.opacity = '1'; }
    else {
      setMode('waiting');
      apply(performance.now());
      // The engine is fetched right away (the headline is already painted); it never blocks the page.
      begin();
    }
    stage.dataset.ready = 'true';

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('themechange', onTheme);
    stage.addEventListener('click', onReplay);
    reduced.addEventListener('change', onPreference);

    return () => {
      disposed = true;
      clearTimeout(budget);
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle); else clearTimeout(idle);
      cancelAnimationFrame(frame);
      visibility.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('themechange', onTheme);
      stage.removeEventListener('click', onReplay);
      reduced.removeEventListener('change', onPreference);
      renderer?.dispose();
    };
  }, []);

  return <div className="hero-stage" ref={root} aria-hidden="true">
    {/* The finished symbol, cropped from the official logo file for the theme, never redrawn. */}
    <span className="hero-symbol">
      <img className="for-light" src="/brand/logo.svg" width="1408" height="311" alt="" fetchPriority="low" />
      <img className="for-dark" src="/brand/logo-light.svg" width="1408" height="311" alt="" fetchPriority="low" />
    </span>
    {/* Flat concept states on the same path: shown before WebGL is ready, or without it. */}
    <svg className="hero-fallback" viewBox="-2 -2 4 4" width={4 * FALLBACK_UNIT} height={4 * FALLBACK_UNIT}>
      <defs>
        <filter id="hero-card" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0.02" dy="0.03" stdDeviation="0.025" floodColor="#0b1a33" floodOpacity="0.16" />
        </filter>
      </defs>
      {/* symbol units (tile half-size 1, y up) → world units (y down) */}
      <g transform={`scale(${SYMBOL.tileHalf} ${-SYMBOL.tileHalf})`} filter="url(#hero-card)">
        <g data-state="0"><circle r={0.34} fill="var(--story-seed)" /></g>
        <g data-state="1" fill="none" strokeLinecap="round">
          {OPEN.map((a, i) => <path key={i} d={arcPath(a.radius, a.from, a.to)} stroke={FALLBACK_COLOURS[ARCS[i].colour]} strokeWidth={2 * a.half} />)}
          <circle cx={MARK.centre.x} cy={MARK.centre.y} r={MARK.dot.r} fill="var(--story-seed)" />
        </g>
        <g data-state="2" fill="none" strokeLinecap="round">
          {LOCKED.map((a, i) => <path key={i} d={arcPath(a.radius, a.from, a.to)} stroke={FALLBACK_COLOURS[ARCS[i].colour]} strokeWidth={2 * a.half} />)}
          <circle cx={MARK.dot.x} cy={MARK.dot.y} r={MARK.dot.r} fill="var(--story-seed)" />
        </g>
      </g>
    </svg>
    <canvas className="hero-canvas" />
  </div>;
}
