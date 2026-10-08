'use client';

import { useEffect, useRef } from 'react';
import { LOGO, SYMBOL, landingFromLogo } from '@/lib/story/geometry';
import type { StoryRenderer } from '@/lib/story/renderer';
import { BEATS, STORY_END, cameraAt, clamp, finaleAt, floorAt, layoutFor, lineAt, placementAt, range, shapeAt, smooth, type Layout, type Placement } from '@/lib/story/timeline';

const SYMBOL_SHARE = 282.78 / LOGO.width;
const FALLBACK_UNIT = 100; // px per world unit in the fallback SVG's untransformed box

/*
  Drives the pinned story: one damped clock from native scroll progress feeds the WebGL
  object, the copy and the logo hand-off in the same frame. Nothing animates on its own:
  frames are requested only by scroll, resize or pointer. Every value is a pure function of
  progress, so scrolling backwards or jumping lands in the same state.
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
    const heroLines = [...hero.querySelectorAll<HTMLElement>('.story-title .line > span')];
    const heroRest = [...hero.children].filter(child => !child.classList.contains('story-title')) as HTMLElement[];
    const beats = [...section.querySelectorAll<HTMLElement>('[data-beat]')];
    const lines = [...section.querySelectorAll<HTMLElement>('[data-line]')];
    const lockup = section.querySelector<HTMLElement>('[data-story-lockup]')!;
    const mark = lockup.querySelector<HTMLElement>('.story-lockup-mark')!;
    const logo = mark.querySelector('img')!;
    const tagline = lockup.querySelector<HTMLElement>('.story-lockup-line');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(pointer: fine)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const abort = new AbortController();

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
    let pixelRatio: MediaQueryList | undefined;

    const isPinned = () => getComputedStyle(section).getPropertyValue('--story-mode').trim() === 'pinned';

    // Measurements happen only on resize: per-frame work is transforms and opacity.
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
      const lb = logo.getBoundingClientRect();
      landing = landingFromLogo({ left: lb.left - box.left, top: lb.top - box.top, width: lb.width });
      renderer?.resize(box.width, box.height);
    };

    const progress = () => {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - pin.offsetHeight;
      return total > 0 ? clamp(-rect.top / total) : 0;
    };

    const apply = (p: number) => {
      const s = clamp(p / STORY_END);
      const shape = shapeAt(s);
      const placement = placementAt(s, layout, landing);
      const finale = finaleAt(s);

      // Object: WebGL when available, otherwise the flat concept states on the same path.
      renderer?.draw({ placement, shape, camera: cameraAt(s, layout.narrow, tilt), floor: floorAt(s), visible: !finale.handed && inView });
      fallback.style.transform = `translate3d(${placement.x - 2 * FALLBACK_UNIT}px, ${placement.y - 2 * FALLBACK_UNIT}px, 0) scale(${placement.scale / FALLBACK_UNIT})`;
      const weights = [1 - shape.cut, shape.cut * (1 - shape.split), shape.split * (1 - smooth(range(s, BEATS.land[0] - 0.04, BEATS.handoff)))];
      states.forEach((state, i) => { state.style.opacity = String(finale.handed ? 0 : weights[i]); });

      // Hero: the headline lifts out of its line masks; the rest settles away.
      heroLines.forEach((span, i) => {
        const out = smooth(range(s, BEATS.heroOut[0] + i * 0.012, BEATS.heroOut[1] + i * 0.012));
        span.style.transform = `translate3d(0, ${-out * 108}%, 0)`;
      });
      const out = smooth(range(s, ...BEATS.heroOut));
      heroRest.forEach((el, i) => {
        const local = smooth(range(s, BEATS.heroOut[0] - 0.01 + i * 0.006, BEATS.heroOut[1] - 0.02 + i * 0.006));
        el.style.opacity = String(1 - local);
        el.style.transform = `translate3d(0, ${-local * 24}px, 0)`;
      });
      hero.inert = out > 0.5;

      // Copy: each sentence rises into place; a beat leaves as one block.
      lines.forEach((line, i) => {
        const l = lineAt(s, i);
        line.style.opacity = String(Math.min(1, l.enter * 1.3));
        line.style.transform = `translate3d(0, ${(1 - l.enter) * 22}px, 0)`;
      });
      beats.forEach((beat, i) => {
        const l = lineAt(s, i === 0 ? 0 : i + 1);
        beat.style.opacity = String(1 - l.leave);
        beat.style.transform = `translate3d(0, ${-l.leave * 18}px, 0)`;
      });

      // Hand-off: the official file takes over at full opacity; the name is revealed by mask.
      const share = finale.handed ? SYMBOL_SHARE + finale.name * (1 - SYMBOL_SHARE) : 0;
      mark.style.clipPath = `inset(-2px ${((1 - share) * 100).toFixed(3)}% -2px 0)`;
      if (tagline) { tagline.style.opacity = String(finale.final); tagline.style.transform = `translate3d(0, ${(1 - finale.final) * 10}px, 0)`; }
    };

    const tick = (now: number) => {
      frame = 0;
      if (disposed || !pinned) return;
      const dt = lastTime ? Math.min(64, now - lastTime) : 16;
      lastTime = now;
      // Short exponential damping smooths wheel steps. No snapping: a long jump (anchor link,
      // fling, End key) plays back as a quick rewind instead of cutting between states.
      shown += (target - shown) * (1 - Math.exp(-dt / 80));
      const k = 1 - Math.exp(-dt / 180);
      tilt = { x: tilt.x + (tiltTarget.x - tilt.x) * k, y: tilt.y + (tiltTarget.y - tilt.y) * k };
      apply(shown);
      const moving = Math.abs(target - shown) > 1e-4 || Math.abs(tiltTarget.x - tilt.x) + Math.abs(tiltTarget.y - tilt.y) > 1e-3;
      if (moving) frame = requestAnimationFrame(tick);
      else {
        lastTime = 0;
        // Profiling readout, written only when motion settles: never per-frame DOM work.
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
    // Zoom or moving the window to another screen changes the pixel ratio without a resize.
    const watchPixelRatio = () => {
      pixelRatio?.removeEventListener('change', onPixelRatio);
      pixelRatio = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      pixelRatio.addEventListener('change', onPixelRatio);
    };
    const onPixelRatio = () => { onResize(); watchPixelRatio(); };

    const eligible = () => !reduced.matches && !connection?.saveData && (navigator.hardwareConcurrency || 4) > 2;
    const load = async () => {
      if (!eligible() || renderer || disposed || !pinned) return;
      try {
        const module = await import('@/lib/story/renderer');
        if (!module.supportsWebGL2()) return;
        const field = await module.loadDistanceField('/sdf/symbol-c.png', abort.signal);
        if (disposed) return;
        const created = await module.createStoryRenderer(canvas, field, {
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
    watchPixelRatio();
    // Defer the GPU work until the page is idle so it never competes with the first paint.
    const idle = typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(() => load(), { timeout: 1200 }) : setTimeout(load, 300);

    return () => {
      disposed = true;
      abort.abort();
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle as number); else clearTimeout(idle);
      cancelAnimationFrame(frame);
      visibility.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      reduced.removeEventListener('change', onPreference);
      pixelRatio?.removeEventListener('change', onPixelRatio);
      renderer?.dispose();
      hero.inert = false;
    };
  }, []);

  return <div className="story-stage" ref={root} aria-hidden="true">
    {/* Flat concept states on the same path: shown before WebGL is ready, or without it. */}
    <svg className="story-fallback" viewBox="-2 -2 4 4" width={4 * FALLBACK_UNIT} height={4 * FALLBACK_UNIT}>
      <defs>
        <radialGradient id="story-seed" cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#2B4A74" /><stop offset="0.65" stopColor="#183255" /><stop offset="1" stopColor="#0F2440" />
        </radialGradient>
      </defs>
      <g data-state="0"><circle r={SYMBOL.ring.outer} fill="url(#story-seed)" /></g>
      <g data-state="1">
        <circle r={SYMBOL.ring.inner} fill="#E8D8C5" />
        <circle r={(SYMBOL.ring.outer + SYMBOL.ring.inner) / 2} fill="none" stroke="#183255" strokeWidth={SYMBOL.ring.outer - SYMBOL.ring.inner} />
      </g>
      <g data-state="2">
        <circle r={SYMBOL.ring.inner - 0.04} fill="#E8D8C5" />
        <path d="M0.62 -0.5A0.79 0.79 0 1 0 0.56 0.56" fill="none" stroke="#183255" strokeWidth={SYMBOL.ring.outer - SYMBOL.ring.inner} strokeLinecap="round" />
        <circle cx={SYMBOL.dot.x} cy={-SYMBOL.dot.y} r={SYMBOL.dot.r} fill="#E8D8C5" />
      </g>
    </svg>
    <canvas className="story-canvas" />
  </div>;
}
