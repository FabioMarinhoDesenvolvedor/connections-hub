'use client';

import { useEffect, useRef } from 'react';
import { LOGO, SYMBOL, landingFromLogo } from '@/lib/story/geometry';
import type { StoryRenderer } from '@/lib/story/renderer';
import { BEATS, chapterAt, clamp, finaleAt, layoutFor, mix, placementAt, poseAt, range, shapeAt, smooth, type Layout, type Placement } from '@/lib/story/timeline';

// Points on the object (world units) each chapter's leader line points at: the seed, the
// opening, the meeting point, the tile. Narrow layouts read from below, so they use the
// lower side of the object.
const ANCHORS = {
  wide: [
    { x: -0.55, y: 0.6 },
    { x: -0.18, y: 0.24 },
    { x: SYMBOL.dot.x, y: SYMBOL.dot.y },
    { x: -SYMBOL.tileHalf * 0.92, y: SYMBOL.tileHalf * 0.5 },
  ],
  narrow: [
    { x: 0, y: -SYMBOL.ring.outer },
    { x: 0, y: -0.42 },
    { x: SYMBOL.dot.x, y: SYMBOL.dot.y },
    { x: 0, y: -SYMBOL.tileHalf },
  ],
};
type Point = { x: number; y: number };

/*
  Drafting convention: a leader never crosses the drawing to reach its target. Targets on
  the far side of the object are reached with orthogonal segments routed around it.
*/
function leaderPath(from: Point, to: Point, centre: Point, extent: number, narrow: boolean) {
  if (narrow) {
    const clear = Math.max(centre.y + extent + 18, to.y);
    return to.x === centre.x || Math.abs(to.x - from.x) < 1
      ? `M${from.x} ${from.y}V${to.y}`
      : `M${from.x} ${from.y}V${clear}H${to.x}V${to.y}`;
  }
  if (to.x <= centre.x) return `M${from.x} ${from.y}H${from.x + (to.x - from.x) * 0.42}L${to.x} ${to.y}`;
  const side = from.x + (centre.x - extent - 24 - from.x) * 0.5;
  const below = centre.y + extent + 28;
  return `M${from.x} ${from.y}H${side}V${below}H${to.x}V${to.y}`;
}
const SYMBOL_SHARE = 282.78 / LOGO.width;
const FALLBACK_UNIT = 100; // px per world unit in the fallback SVG's untransformed box

/*
  Drives the pinned story: one damped clock from native scroll progress feeds the WebGL
  object, the drafting overlay, the copy layers and the logo hand-off in the same frame.
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
    const drafting = stage.querySelector<SVGSVGElement>('.story-drafting')!;
    const frameMarks = drafting.querySelector<SVGPathElement>('[data-frame]')!;
    const leaders = [...drafting.querySelectorAll<SVGPathElement>('[data-leader]')];
    const nodes = [...drafting.querySelectorAll<SVGCircleElement>('[data-node]')];
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
    const abort = new AbortController();

    let renderer: StoryRenderer | undefined;
    let pinned = false;
    let layout: Layout = layoutFor(1, 1);
    let landing: Placement | undefined;
    let textAnchors: { x: number; y: number }[] = [];
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
      drafting.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      const logoBox = logo.getBoundingClientRect();
      landing = landingFromLogo({ left: logoBox.left - box.left, top: logoBox.top - box.top, width: logoBox.width });
      textAnchors = chapters.map(chapter => {
        const text = chapter.querySelector<HTMLElement>('.story-chapter-text')!;
        const r = text.getBoundingClientRect();
        return layout.narrow
          ? { x: r.left - box.left + r.width / 2, y: r.top - box.top - 14 }
          : { x: r.right - box.left + 20, y: r.top - box.top + Math.min(r.height / 2, 20) };
      });
      renderer?.resize(box.width, box.height);
    };

    const progress = () => {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - pin.offsetHeight;
      return total > 0 ? clamp(-rect.top / total) : 0;
    };

    const apply = (p: number) => {
      const shape = shapeAt(p);
      const pose = poseAt(p);
      const placement = placementAt(p, layout, landing);
      const finale = finaleAt(p);
      const free = 1 - shape.flat;
      pose.pitch += tilt.y * 0.12 * free;
      pose.yaw += tilt.x * 0.18 * free;

      // Object: WebGL when available, otherwise the flat concept states on the same path.
      renderer?.draw({ placement, shape, pose, visible: !finale.handed && inView });
      fallback.style.transform = `translate3d(${placement.x - 2 * FALLBACK_UNIT}px, ${placement.y - 2 * FALLBACK_UNIT}px, 0) scale(${placement.scale / FALLBACK_UNIT})`;
      const weights = [1 - shape.open, shape.open * (1 - shape.split), shape.split * (1 - smooth(range(p, BEATS.land[0] - 0.04, BEATS.handoff)))];
      states.forEach((state, i) => { state.style.opacity = String(finale.handed ? 0 : weights[i]); });

      // Hero copy hands the stage over.
      const out = smooth(range(p, ...BEATS.heroOut));
      hero.style.opacity = String(1 - out);
      hero.style.transform = `translate3d(0, ${-out * 56}px, 0)`;
      hero.inert = out > 0.5;
      if (cue) cue.style.opacity = String(1 - smooth(range(p, 0, 0.04)));

      // Chapters and their leader lines.
      const half = placement.scale;
      const anchors = layout.narrow ? ANCHORS.narrow : ANCHORS.wide;
      const extent = half * mix(SYMBOL.ring.outer, SYMBOL.tileHalf, shape.tile);
      chapters.forEach((chapter, i) => {
        const c = chapterAt(p, i);
        chapter.style.opacity = String(c.visible);
        chapter.style.transform = `translate3d(0, ${(1 - c.enter) * 18 - c.leave * 18}px, 0)`;
        const from = textAnchors[i];
        const leader = leaders[i];
        const node = nodes[i];
        if (!from || c.draw <= 0) { leader.style.opacity = '0'; node.style.opacity = '0'; return; }
        const to = { x: placement.x + anchors[i].x * half, y: placement.y - anchors[i].y * half };
        leader.setAttribute('d', leaderPath(from, to, placement, extent, layout.narrow));
        leader.style.opacity = '1';
        leader.style.strokeDashoffset = String(1 - c.draw);
        node.setAttribute('cx', String(to.x));
        node.setAttribute('cy', String(to.y));
        node.style.opacity = String(smooth(range(c.draw, 0.85, 1)));
      });

      // Drafting frame: crosshair and registration marks around the object.
      const r = 1.28 * half * mix(1, SYMBOL.tileHalf / SYMBOL.ring.outer, shape.tile);
      const arm = 0.22 * r;
      const { x, y } = placement;
      const reach = r + 0.35 * half;
      frameMarks.setAttribute('d',
        `M${x - reach} ${y}H${x - r * 0.25}M${x + r * 0.25} ${y}H${x + reach}M${x} ${y - reach}V${y - r * 0.25}M${x} ${y + r * 0.25}V${y + reach}` +
        `M${x - r} ${y - r + arm}V${y - r}H${x - r + arm}M${x + r - arm} ${y - r}H${x + r}V${y - r + arm}` +
        `M${x + r} ${y + r - arm}V${y + r}H${x + r - arm}M${x - r + arm} ${y + r}H${x - r}V${y + r - arm}`);
      frameMarks.style.opacity = String(smooth(range(p, BEATS.travel[0], BEATS.travel[1])) * finale.frame * 0.9 + (1 - smooth(range(p, 0, BEATS.travel[1]))) * 0.55 * finale.frame);

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
        <circle r={SYMBOL.ring.outer - 0.02} fill="#E8D8C5" />
        <circle r={(SYMBOL.ring.outer + SYMBOL.ring.inner) / 2} fill="none" stroke="#183255" strokeWidth={SYMBOL.ring.outer - SYMBOL.ring.inner} />
      </g>
      <g data-state="2">
        <circle r={SYMBOL.ring.inner + 0.06} fill="#E8D8C5" />
        <path d={`M0.62 -0.5A0.79 0.79 0 1 0 0.56 0.56`} fill="none" stroke="#183255" strokeWidth={SYMBOL.ring.outer - SYMBOL.ring.inner} strokeLinecap="round" />
        <circle cx={SYMBOL.dot.x} cy={-SYMBOL.dot.y} r={SYMBOL.dot.r} fill="#183255" />
      </g>
    </svg>
    <canvas className="story-canvas" />
    <svg className="story-drafting">
      <path data-frame className="story-frame" />
      {[0, 1, 2, 3].map(i => <path key={i} data-leader className="story-leader" pathLength={1} />)}
      {[0, 1, 2, 3].map(i => <circle key={i} data-node className="story-node" r={4} />)}
    </svg>
  </div>;
}
