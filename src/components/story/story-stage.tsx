'use client';

import { useEffect, useRef } from 'react';
import { annotate, construction } from '@/lib/story/annotations';
import { LOGO, SYMBOL, landingFromLogo } from '@/lib/story/geometry';
import type { StoryRenderer } from '@/lib/story/renderer';
import { BEATS, STORY_END, atmosphereAt, cameraAt, chapterAt, clamp, finaleAt, floorAt, layoutFor, placementAt, range, shapeAt, smooth, type Layout, type Placement } from '@/lib/story/timeline';

const SYMBOL_SHARE = 282.78 / LOGO.width;
const FALLBACK_UNIT = 100; // px per world unit in the fallback SVG's untransformed box

/*
  Drafting convention: a leader never crosses the drawing to reach its target. It runs from
  the chapter's copy to the annotation it refers to, with one elbow.
*/
function leaderPath(from: { x: number; y: number }, to: { x: number; y: number }, narrow: boolean) {
  if (narrow) return `M${from.x} ${from.y}V${from.y - (from.y - to.y) * 0.5}L${to.x} ${to.y}`;
  return `M${from.x} ${from.y}H${from.x + (to.x - from.x) * 0.45}L${to.x} ${to.y}`;
}

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
    const leaders = [...drafting.querySelectorAll<SVGPathElement>('[data-leader]')];
    const dims = [...drafting.querySelectorAll<SVGGElement>('[data-dim]')].map(group => ({
      group,
      line: group.querySelector<SVGPathElement>('[data-dim-line]')!,
      dash: group.querySelector<SVGPathElement>('[data-dim-dash]')!,
      label: group.querySelector<SVGTextElement>('text')!,
    }));
    const build = drafting.querySelector<SVGGElement>('[data-construction]')!;
    const buildLine = build.querySelector<SVGPathElement>('[data-dim-line]')!;
    const buildDim = build.querySelector<SVGPathElement>('[data-dim-dash]')!;
    const buildLabel = build.querySelector<SVGTextElement>('text')!;
    const hero = section.querySelector<HTMLElement>('[data-story-hero]')!;
    const heroLines = [...hero.querySelectorAll<HTMLElement>('.story-title .line > span')];
    const heroRest = [...hero.children].filter(child => !child.classList.contains('story-title')) as HTMLElement[];
    const titleBlock = section.querySelector<HTMLElement>('[data-title-block]');
    const titleFacts = section.querySelector<HTMLElement>('[data-title-facts]');
    const titleIndex = section.querySelector<HTMLElement>('[data-title-index]');
    const indexItems = titleIndex ? [...titleIndex.querySelectorAll<HTMLElement>('li')] : [];
    const cue = section.querySelector<HTMLElement>('[data-story-cue]');
    const chapters = [...section.querySelectorAll<HTMLElement>('[data-chapter]')];
    const paper = section.querySelector<HTMLElement>('[data-story-paper]');
    const tints = { warm: section.querySelector<HTMLElement>('[data-tint="warm"]'), cool: section.querySelector<HTMLElement>('[data-tint="cool"]') };
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
    let logoBox = { left: 0, top: 0, width: 1 };
    let grid = { cell: 1, alignX: 0, alignY: 0 };
    let textAnchors: { x: number; y: number }[] = [];
    let activeIndex = -1;
    const labelWidths: number[] = [];
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
      const lb = logo.getBoundingClientRect();
      logoBox = { left: lb.left - box.left, top: lb.top - box.top, width: lb.width };
      landing = landingFromLogo(logoBox);
      // The 3D floor folds into the page grid at the hand-off: align its lines to the CSS grid.
      const cellPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--grid-cell')) || 72;
      grid = {
        cell: cellPx / landing.scale,
        alignX: (box.width / 2 - cellPx / 2 + 0.5 - landing.x) / landing.scale,
        alignY: (landing.y - (box.height / 2 - cellPx / 2 + 0.5)) / landing.scale + SYMBOL.tileHalf + 0.004,
      };
      textAnchors = chapters.map((chapter, i) => {
        const text = chapter.querySelector<HTMLElement>('.story-chapter-text')!;
        const r = text.getBoundingClientRect();
        if (layout.narrow) return { x: r.left - box.left + r.width / 2, y: r.top - box.top - 16 };
        // Chapters 02 and 03 sit right of the object: their leaders leave from the left edge.
        return i === 1 || i === 2
          ? { x: r.left - box.left - 20, y: r.top - box.top + Math.min(r.height / 2, 22) }
          : { x: r.right - box.left + 20, y: r.top - box.top + Math.min(r.height / 2, 22) };
      });
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
      const camera = cameraAt(s, layout.narrow, tilt);
      const floor = floorAt(s);
      const placement = placementAt(s, layout, landing);
      const finale = finaleAt(s);

      // Object: WebGL when available, otherwise the flat concept states on the same path.
      renderer?.draw({ placement, shape, camera, floor: { ...floor, ...grid }, visible: !finale.handed && inView });
      fallback.style.transform = `translate3d(${placement.x - 2 * FALLBACK_UNIT}px, ${placement.y - 2 * FALLBACK_UNIT}px, 0) scale(${placement.scale / FALLBACK_UNIT})`;
      const weights = [1 - shape.open, shape.open * (1 - shape.split), shape.split * (1 - smooth(range(s, BEATS.land[0] - 0.04, BEATS.handoff)))];
      states.forEach((state, i) => { state.style.opacity = String(finale.handed ? 0 : weights[i]); });

      // Atmosphere: the 3D floor replaces the page grid until it folds back into it.
      const atmosphere = atmosphereAt(s);
      if (tints.warm) tints.warm.style.opacity = atmosphere.warm.toFixed(3);
      if (tints.cool) tints.cool.style.opacity = atmosphere.cool.toFixed(3);
      if (paper) paper.style.opacity = renderer ? smooth(range(s, BEATS.flat[1] - 0.02, BEATS.handoff + 0.01)).toFixed(3) : '1';

      // Hero: the headline lifts out of its line masks, line by line; the rest settles away.
      heroLines.forEach((span, i) => {
        const out = smooth(range(s, BEATS.heroOut[0] + i * 0.012, BEATS.heroOut[1] + i * 0.012));
        span.style.transform = `translate3d(0, ${-out * 108}%, 0)`;
      });
      const out = smooth(range(s, ...BEATS.heroOut));
      heroRest.forEach((el, i) => {
        const local = smooth(range(s, BEATS.heroOut[0] - 0.01 + i * 0.006, BEATS.heroOut[1] - 0.02 + i * 0.006));
        el.style.opacity = String(1 - local);
        el.style.transform = `translate3d(0, ${-local * 28}px, 0)`;
      });
      hero.inert = out > 0.5;
      if (cue) cue.style.opacity = String(1 - smooth(range(s, 0, 0.03)));

      // Title block: the hero's facts give way to the chapter index, which tracks the story.
      const indexIn = smooth(range(s, 0.08, 0.13)) * (1 - smooth(range(s, BEATS.land[0], BEATS.land[0] + 0.03)));
      if (titleFacts) { titleFacts.style.opacity = String(1 - out); titleFacts.style.visibility = out > 0.99 ? 'hidden' : ''; }
      if (titleIndex) titleIndex.style.opacity = indexIn.toFixed(3);
      if (titleBlock) titleBlock.inert = out > 0.5;

      // Chapters: the copy wipes up into view, its annotation draws on the object.
      let current = -1, strongest = 0;
      chapters.forEach((chapter, i) => {
        const c = chapterAt(s, i);
        if (c.visible > strongest) { strongest = c.visible; current = i; }
        chapter.style.opacity = String(Math.min(1, c.enter * 1.4) * (1 - c.leave));
        chapter.style.clipPath = `inset(-20% 0 ${((1 - c.enter) * 100).toFixed(2)}% 0)`;
        chapter.style.transform = `translate3d(0, ${(1 - c.enter) * 24 - c.leave * 20}px, 0)`;

        const dim = dims[i];
        const ready = i === 1 ? smooth(range(shape.open, 0.1, 0.5)) : i === 2 ? smooth(range(shape.dot, 0.15, 0.6)) : i === 3 ? smooth(range(shape.tile, 0.78, 1)) : 1;
        const draw = c.draw * ready;
        if (draw <= 0.001) { dim.group.style.opacity = '0'; leaders[i].style.opacity = '0'; return; }
        const a = annotate(i, shape, camera, placement);
        dim.group.style.opacity = '1';
        dim.line.setAttribute('d', a.line);
        dim.line.style.strokeDashoffset = String(1 - draw);
        dim.dash.setAttribute('d', a.dash);
        dim.dash.style.opacity = String(smooth(range(draw, 0.2, 0.8)));
        if (dim.label.textContent !== a.label.text) { dim.label.textContent = a.label.text; labelWidths[i] = 0; }
        // Labels never leave the viewport: measure once per text, then clamp.
        if (!labelWidths[i]) labelWidths[i] = dim.label.getComputedTextLength() || a.label.text.length * 7;
        const width = labelWidths[i];
        const left = a.label.anchor === 'start' ? a.label.x : a.label.anchor === 'middle' ? a.label.x - width / 2 : a.label.x - width;
        a.label.x += Math.min(0, layout.width - 12 - (left + width)) + Math.max(0, 12 - left);
        dim.label.setAttribute('x', a.label.x.toFixed(1));
        dim.label.setAttribute('y', a.label.y.toFixed(1));
        dim.label.setAttribute('text-anchor', a.label.anchor);
        dim.label.style.opacity = String(smooth(range(draw, 0.55, 1)));
        // A leader only where it bridges a real gap between copy and measurement; in 02 and
        // 03 the label already sits beside the copy and a line would only add noise.
        const from = !layout.narrow && (i === 0 || i === 3) ? textAnchors[i] : undefined;
        if (!from) leaders[i].style.opacity = '0';
        else {
          leaders[i].setAttribute('d', leaderPath(from, a.anchor, layout.narrow));
          leaders[i].style.opacity = '1';
          leaders[i].style.strokeDashoffset = String(1 - smooth(range(draw, 0.1, 0.9)));
        }
      });
      if (current !== activeIndex) {
        activeIndex = current;
        indexItems.forEach((item, i) => item.toggleAttribute('data-active', i === current));
      }

      // Hand-off: the official file takes over at full opacity; the name is revealed by mask,
      // with the lockup's own construction lines drawn while it appears.
      const share = finale.handed ? SYMBOL_SHARE + finale.name * (1 - SYMBOL_SHARE) : 0;
      mark.style.clipPath = `inset(-2px ${((1 - share) * 100).toFixed(3)}% -2px 0)`;
      if (finale.construction > 0.001) {
        const c = construction(logoBox);
        build.style.opacity = '1';
        buildLine.setAttribute('d', c.line);
        buildLine.style.strokeDashoffset = String(1 - finale.construction);
        buildLine.style.opacity = String(finale.construction);
        buildDim.setAttribute('d', c.dimension);
        buildDim.style.opacity = String(finale.construction);
        if (buildLabel.textContent !== c.label.text) buildLabel.textContent = c.label.text;
        buildLabel.setAttribute('x', c.label.x.toFixed(1));
        buildLabel.setAttribute('y', c.label.y.toFixed(1));
        buildLabel.style.opacity = String(finale.construction);
      } else build.style.opacity = '0';
      if (line) { line.style.opacity = String(finale.final); line.style.transform = `translate3d(0, ${(1 - finale.final) * 12}px, 0)`; }
    };

    const tick = (now: number) => {
      frame = 0;
      if (disposed || !pinned) return;
      const dt = lastTime ? Math.min(64, now - lastTime) : 16;
      lastTime = now;
      // Short critical damping smooths wheel steps without lagging behind the scroll.
      shown = Math.abs(target - shown) > 0.2 ? target : shown + (target - shown) * (1 - Math.exp(-dt / 80));
      const k = 1 - Math.exp(-dt / 180);
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
      if (titleBlock) titleBlock.inert = false;
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
        <path d="M0.62 -0.5A0.79 0.79 0 1 0 0.56 0.56" fill="none" stroke="#183255" strokeWidth={SYMBOL.ring.outer - SYMBOL.ring.inner} strokeLinecap="round" />
        <circle cx={SYMBOL.dot.x} cy={-SYMBOL.dot.y} r={SYMBOL.dot.r} fill="#183255" />
      </g>
    </svg>
    <canvas className="story-canvas" />
    <svg className="story-drafting">
      {[0, 1, 2, 3].map(i => <path key={`l${i}`} data-leader className="story-leader" pathLength={1} />)}
      {[0, 1, 2, 3].map(i => <g key={`d${i}`} data-dim={i} className="story-dim">
        <path data-dim-dash className="story-dim-dash" />
        <path data-dim-line className="story-dim-line" pathLength={1} />
        <text className="story-dim-label" />
      </g>)}
      <g data-construction className="story-dim story-construction">
        <path data-dim-line className="story-dim-line" pathLength={1} />
        <path data-dim-dash className="story-dim-line" />
        <text className="story-dim-label" textAnchor="middle" />
      </g>
    </svg>
  </div>;
}
