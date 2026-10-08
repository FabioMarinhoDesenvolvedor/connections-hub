'use client';

import { useEffect, useRef } from 'react';
import { LOGO, SYMBOL, landingFromLogo } from '@/lib/story/geometry';
import type { StoryRenderer } from '@/lib/story/renderer';
import { ARCS, MARK, arcPath, orbitAt } from '@/lib/story/orbits';
import { BEATS, chapterAt, clamp, finaleAt, layoutFor, placementAt, range, smooth, type Layout, type Placement } from '@/lib/story/timeline';

const SYMBOL_SHARE = 282.78 / LOGO.width;
const FALLBACK_UNIT = 100; // px per world unit in the fallback SVG's untransformed box
const FALLBACK_COLOURS = { navy: '#183255', orange: '#C16042', sand: '#E8D8C5', paper: '#F8F6F0' };
// Flat snapshots of the same choreography, for the moments before (or without) WebGL.
const OPEN = orbitAt(0.4).arcs;
const LOCKED = orbitAt(0.58).arcs;

/*
  Drives the pinned story: one damped clock from native scroll progress feeds the WebGL
  object, the copy layers and the logo hand-off in the same frame.
  Nothing animates on its own: frames are requested only by scroll, resize or pointer.
*/
export function StoryStage() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = root.current;
    const section = stage?.closest<HTMLElement>('[data-story]');
    const pin = section?.querySelector<HTMLElement>('.story-pin');
    if (!stage || !section || !pin) return;
    const canvas = stage.querySelector('canvas')!;
    const fallback = stage.querySelector<SVGSVGElement>('.story-fallback')!;
    const states = [...fallback.querySelectorAll<SVGGElement>('[data-state]')];
    const hero = section.querySelector<HTMLElement>('[data-story-hero]')!;
    const cue = section.querySelector<HTMLElement>('[data-story-cue]');
    const chapters = [...section.querySelectorAll<HTMLElement>('[data-chapter]')];
    const lockup = section.querySelector<HTMLElement>('[data-story-lockup]')!;
    const mark = lockup.querySelector<HTMLElement>('.story-lockup-mark')!;
    const logo = mark.querySelector('img')!;
    const line = lockup.querySelector<HTMLElement>('.story-lockup-line');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(pointer: fine)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;

    let renderer: StoryRenderer | undefined;
    let pinned = false;
    let layout: Layout = layoutFor(1, 1);
    let landing: Placement | undefined;
    let target = 0;
    let shown = 0;
    let tilt = { x: 0, y: 0 };
    let tiltTarget = { x: 0, y: 0 };
    let frame = 0;
    let lastTime = 0;
    let inView = true;
    let disposed = false;

    const isPinned = () => getComputedStyle(section).getPropertyValue('--story-mode').trim() === 'pinned';

    // Measurements happen only on resize: per-frame work is transforms and attributes.
    const measure = () => {
      pinned = isPinned();
      section.dataset.mode = pinned ? 'pinned' : 'static';
      if (!pinned) return;
      const box = pin.getBoundingClientRect();
      layout = layoutFor(box.width, box.height);
      if (layout.narrow) {
        // offsetTop ignores the hero's scroll transform, so the slot is stable mid-story.
        const first = hero.firstElementChild as HTMLElement | null;
        const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 60;
        layout = layoutFor(box.width, box.height, { top: nav + 8, bottom: (first?.offsetTop ?? box.height * 0.42) - 16 });
      }
      const logoBox = logo.getBoundingClientRect();
      landing = landingFromLogo({ left: logoBox.left - box.left, top: logoBox.top - box.top, width: logoBox.width });
      renderer?.resize(box.width, box.height);
    };

    const progress = () => {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - pin.offsetHeight;
      return total > 0 ? clamp(-rect.top / total) : 0;
    };

    const apply = (p: number) => {
      const placement = placementAt(p, layout, landing);
      const finale = finaleAt(p);

      // Object: WebGL when available, otherwise the flat concept states on the same path.
      renderer?.draw({ placement, state: orbitAt(p, tilt), visible: !finale.handed && inView });
      fallback.style.transform = `translate3d(${placement.x - 2 * FALLBACK_UNIT}px, ${placement.y - 2 * FALLBACK_UNIT}px, 0) scale(${placement.scale / FALLBACK_UNIT})`;
      const open = smooth(range(p, ...BEATS.release)), locked = smooth(range(p, ...BEATS.lock));
      const weights = [1 - open, open * (1 - locked), locked * (1 - smooth(range(p, BEATS.land[0] - 0.04, BEATS.handoff)))];
      states.forEach((state, i) => { state.style.opacity = String(finale.handed ? 0 : weights[i]); });

      // Hero copy hands the stage over.
      const out = smooth(range(p, ...BEATS.heroOut));
      hero.style.opacity = String(1 - out);
      hero.style.transform = `translate3d(0, ${-out * 56}px, 0)`;
      hero.inert = out > 0.5;
      if (cue) cue.style.opacity = String(1 - smooth(range(p, 0, 0.04)));

      // Chapters.
      chapters.forEach((chapter, i) => {
        const c = chapterAt(p, i);
        chapter.style.opacity = String(c.visible);
        chapter.style.transform = `translate3d(0, ${(1 - c.enter) * 18 - c.leave * 18}px, 0)`;
      });

      // Hand-off: the official file takes over at full opacity; the name is revealed by mask.
      const share = finale.handed ? SYMBOL_SHARE + finale.name * (1 - SYMBOL_SHARE) : 0;
      mark.style.clipPath = `inset(-2px ${((1 - share) * 100).toFixed(3)}% -2px 0)`;
      if (line) { line.style.opacity = String(finale.final); line.style.transform = `translate3d(0, ${(1 - finale.final) * 12}px, 0)`; }
    };

    const tick = (now: number) => {
      frame = 0;
      if (disposed || !pinned) return;
      const dt = lastTime ? Math.min(64, now - lastTime) : 16;
      lastTime = now;
      // Short critical damping smooths wheel steps without lagging behind the scroll.
      shown = Math.abs(target - shown) > 0.2 ? target : shown + (target - shown) * (1 - Math.exp(-dt / 80));
      const k = 1 - Math.exp(-dt / 160);
      tilt = { x: tilt.x + (tiltTarget.x - tilt.x) * k, y: tilt.y + (tiltTarget.y - tilt.y) * k };
      apply(shown);
      const moving = Math.abs(target - shown) > 1e-4 || Math.abs(tiltTarget.x - tilt.x) + Math.abs(tiltTarget.y - tilt.y) > 1e-3;
      if (moving) frame = requestAnimationFrame(tick);
      else {
        lastTime = 0;
        // Profiling readout (drawn frames, internal pixel ratio, GPU ms where measurable),
        // written only when motion settles so it never adds per-frame DOM work.
        if (renderer) Object.assign(stage.dataset, { frames: renderer.stats.frames, scale: renderer.stats.scale.toFixed(2), gpu: renderer.stats.gpu });
      }
    };
    const request = () => { if (!frame && pinned && !disposed) frame = requestAnimationFrame(tick); };
    const onScroll = () => { target = progress(); request(); };
    const onResize = () => { measure(); target = shown = progress(); request(); };
    const onPointer = (event: PointerEvent) => {
      if (!fine.matches || !inView) return;
      tiltTarget = { x: (event.clientX / window.innerWidth) * 2 - 1, y: (event.clientY / window.innerHeight) * 2 - 1 };
      request();
    };

    const eligible = () => !reduced.matches && !connection?.saveData && (navigator.hardwareConcurrency || 4) > 2;
    const load = async () => {
      if (!eligible() || renderer || disposed || !pinned) return;
      try {
        const module = await import('@/lib/story/renderer');
        if (!module.supportsWebGL2() || disposed) return;
        const created = await module.createStoryRenderer(canvas, {
          compact: layout.narrow,
          onLost: () => { renderer?.dispose(); renderer = undefined; stage.dataset.gl = 'lost'; apply(shown); },
        });
        if (disposed) { created.dispose(); return; }
        renderer = created;
        measure();
        apply(shown);
        stage.dataset.gl = 'on';
      } catch { stage.dataset.gl = 'off'; }
    };

    const visibility = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; request(); });
    visibility.observe(section);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(pin);
    const onPreference = () => { measure(); if (!pinned || reduced.matches) { renderer?.dispose(); renderer = undefined; stage.dataset.gl = 'off'; } else load(); onResize(); };

    measure();
    target = shown = progress();
    if (pinned) apply(shown);
    stage.dataset.ready = 'true';
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    reduced.addEventListener('change', onPreference);
    // The 3D engine is fetched on the reader's first sign of intent (the flat seed already
    // stands in for it in the hero), or after a quiet spell, never during the first load.
    const intents = ['scroll', 'pointermove', 'touchstart', 'keydown'] as const;
    const start = () => { intents.forEach(name => window.removeEventListener(name, start)); load(); };
    intents.forEach(name => window.addEventListener(name, start, { passive: true, once: true }));
    let idle = 0;
    const quiet = window.setTimeout(() => {
      idle = typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(start, { timeout: 4000 }) : window.setTimeout(start, 0);
    }, 9000);

    return () => {
      disposed = true;
      clearTimeout(quiet);
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle); else clearTimeout(idle);
      intents.forEach(name => window.removeEventListener(name, start));
      cancelAnimationFrame(frame);
      visibility.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      reduced.removeEventListener('change', onPreference);
      renderer?.dispose();
      hero.inert = false;
    };
  }, []);

  return <div className="story-stage" ref={root} aria-hidden="true">
    {/* Flat concept states on the same path: shown before WebGL is ready, or without it. */}
    <svg className="story-fallback" viewBox="-2 -2 4 4" width={4 * FALLBACK_UNIT} height={4 * FALLBACK_UNIT}>
      <defs>
        <filter id="story-card" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0.02" dy="0.03" stdDeviation="0.025" floodColor="#0b1a33" floodOpacity="0.16" />
        </filter>
      </defs>
      {/* symbol units (tile half-size 1, y up) → world units (y down) */}
      <g transform={`scale(${SYMBOL.tileHalf} ${-SYMBOL.tileHalf})`} filter="url(#story-card)">
        <g data-state="0"><circle r={0.34} fill={FALLBACK_COLOURS.navy} /></g>
        <g data-state="1" fill="none" strokeLinecap="round">
          {OPEN.map((a, i) => <path key={i} d={arcPath(a.radius, a.from, a.to)} stroke={FALLBACK_COLOURS[ARCS[i].colour]} strokeWidth={2 * a.half} />)}
          <circle cx={MARK.centre.x} cy={MARK.centre.y} r={MARK.dot.r} fill={FALLBACK_COLOURS.navy} />
        </g>
        <g data-state="2" fill="none" strokeLinecap="round">
          {LOCKED.map((a, i) => <path key={i} d={arcPath(a.radius, a.from, a.to)} stroke={FALLBACK_COLOURS[ARCS[i].colour]} strokeWidth={2 * a.half} />)}
          <circle cx={MARK.dot.x} cy={MARK.dot.y} r={MARK.dot.r} fill={FALLBACK_COLOURS.navy} />
        </g>
      </g>
    </svg>
    <canvas className="story-canvas" />
  </div>;
}
