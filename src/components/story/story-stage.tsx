'use client';

import { useEffect, useRef } from 'react';
import { LOGO, SYMBOL, landingFromLogo } from '@/lib/story/geometry';
import type { StoryRenderer } from '@/lib/story/renderer';
import { ARCS, MARK, REST, arcPath, orbitAt, type Play } from '@/lib/story/orbits';
import { BEATS, chapterAt, clamp, finaleAt, layoutFor, placementAt, range, smooth, type Layout, type Placement } from '@/lib/story/timeline';

const SYMBOL_SHARE = 282.78 / LOGO.width;
const FALLBACK_UNIT = 100; // px per world unit in the fallback SVG's untransformed box
// Fallback colours are theme tokens (see .story-fallback in globals.css).
const FALLBACK_COLOURS = { navy: 'var(--story-arc-navy)', orange: 'var(--orange)', sand: 'var(--sand)', paper: 'var(--off-white)' };
// Flat snapshots of the same choreography, for the moments before (or without) WebGL.
const OPEN = orbitAt(0.4).arcs;
const LOCKED = orbitAt(0.58).arcs;

/*
  Hands-on seed, in the hero only, once WebGL is up. Springs in seconds; angles in degrees.
  Play never reaches the story: its influence fades out over the first PLAY_UNTIL of scroll
  and beyond that the story receives REST, so every later frame is exactly the authored one.
*/
const PLAY_UNTIL = 0.02;
const OPEN_SPRING = { k: 85, c: 10 };  // under-damped: the arcs overshoot back into the seed
const SPIN_FRICTION = 1.1;      // 1/s
const SPIN_TO_OPEN = 1 / 520;   // a dial turning at 520°/s holds the seed fully open
const BLOOM_SPIN = 1080;        // degrees of turning (or ~5 quick presses) that open the whole idea
const BLOOM_HOLD = 2600;        // ms the full C· stays before folding back
const HIT = 1.15;               // touch target, in seed radii

/*
  Drives the pinned story: one damped clock from native scroll progress feeds the WebGL
  object, the copy layers and the logo hand-off in the same frame.
  Nothing animates on its own: frames are requested only by scroll, resize or pointer, and
  while the seed in the hero is still settling from being played with.
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
    const logos = [...mark.querySelectorAll('img')];
    const line = lockup.querySelector<HTMLElement>('.story-lockup-line');
    const secret = section.querySelector<HTMLElement>('[data-story-secret]');
    const seedTarget = section.querySelector<HTMLElement>('[data-story-seed]');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(pointer: fine)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const isDark = () => document.documentElement.dataset.theme === 'dark';

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

    // Seed play state (see Play in orbits.ts) and the pointer that drives it.
    const play: Play = { ...REST, lean: { x: 0, y: 0 } };
    let openVelocity = 0, spinVelocity = 0, dragVelocity = 0, energy = 0, bloomTarget = 0, bloomTimer = 0;
    let liftTarget = 0, pressTarget = 0, leanTarget = { x: 0, y: 0 };
    let dragging: { id: number; angle: number; time: number; touch: boolean } | undefined;
    let seedPx = { x: 0, y: 0, r: 0 };
    let hitKey = '';

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
      // The logo file shown for the current theme is the one the object lands on.
      const logo = logos.find(img => img.getClientRects().length) ?? logos[0];
      const logoBox = logo.getBoundingClientRect();
      landing = landingFromLogo({ left: logoBox.left - box.left, top: logoBox.top - box.top, width: logoBox.width });
      renderer?.resize(box.width, box.height);
    };

    const progress = () => {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - pin.offsetHeight;
      return total > 0 ? clamp(-rect.top / total) : 0;
    };

    /** Play as the story sees it: full in the hero, fading over the first scroll, then REST. */
    const playAt = (p: number): Play => {
      const weight = 1 - smooth(range(p, 0, PLAY_UNTIL));
      if (weight <= 0) return REST;
      return {
        open: play.open * weight, spin: play.spin, bloom: play.bloom * weight, lift: play.lift * weight,
        press: play.press * weight, lean: { x: play.lean.x * weight, y: play.lean.y * weight },
      };
    };
    const playing = () => play.open > 1e-3 || play.bloom > 1e-3 || play.lift > 1e-3 || play.press > 1e-3
      || Math.abs(play.lean.x) + Math.abs(play.lean.y) > 1e-3 || Boolean(dragging);

    const apply = (p: number) => {
      const placement = placementAt(p, layout, landing);
      const finale = finaleAt(p);

      // Object: WebGL when available, otherwise the flat concept states on the same path.
      const state = orbitAt(p, tilt, playAt(p));
      renderer?.draw({ placement, state, visible: !finale.handed && inView, adapt: !playing() });
      fallback.style.transform = `translate3d(${placement.x - 2 * FALLBACK_UNIT}px, ${placement.y - 2 * FALLBACK_UNIT}px, 0) scale(${placement.scale / FALLBACK_UNIT})`;
      const open = smooth(range(p, ...BEATS.release)), locked = smooth(range(p, ...BEATS.lock));
      const weights = [1 - open, open * (1 - locked), locked * (1 - smooth(range(p, BEATS.land[0] - 0.04, BEATS.handoff)))];
      states.forEach((state, i) => { state.style.opacity = String(finale.handed ? 0 : weights[i]); });

      // The seed's touch target and the caption that answers a full bloom.
      const unit = placement.scale * SYMBOL.tileHalf; // px per symbol unit
      seedPx = { x: placement.x + MARK.centre.x * unit, y: placement.y - MARK.centre.y * unit, r: 0.34 * unit };
      if (seedTarget) {
        const live = Boolean(renderer) && p < PLAY_UNTIL;
        const key = `${live}|${seedPx.r.toFixed(1)}`;
        if (key !== hitKey) {
          hitKey = key;
          seedTarget.dataset.live = String(live);
          seedTarget.style.width = seedTarget.style.height = `${(2 * HIT * seedPx.r).toFixed(1)}px`;
        }
        seedTarget.style.transform = `translate3d(${(seedPx.x - HIT * seedPx.r).toFixed(1)}px, ${(seedPx.y - HIT * seedPx.r).toFixed(1)}px, 0)`;
      }
      if (secret) {
        const reveal = smooth(clamp(playAt(p).bloom * 1.6 - 0.6));
        secret.style.opacity = String(reveal);
        secret.style.transform = `translate3d(${placement.x}px, ${placement.y + unit * (layout.narrow ? 0.78 : 0.92) + (1 - reveal) * 10}px, 0) translateX(-50%)`;
      }

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

    const playable = () => Boolean(renderer) && pinned && inView && shown < PLAY_UNTIL;

    /** Advances the seed's springs by s seconds; true while anything is still moving. */
    const settlePlay = (s: number) => {
      if (!playable()) { liftTarget = pressTarget = 0; leanTarget = { x: 0, y: 0 }; dragging = undefined; }
      if (!dragging) {
        play.spin += spinVelocity * s;
        spinVelocity *= Math.exp(-SPIN_FRICTION * s);
        if (Math.abs(spinVelocity) < 4) spinVelocity = 0;
      }
      // Turning dials hold the seed open; otherwise it springs shut, overshooting a little.
      const hold = Math.min(0.85, Math.abs(spinVelocity) * SPIN_TO_OPEN);
      openVelocity += (OPEN_SPRING.k * (hold - play.open) - OPEN_SPRING.c * openVelocity) * s;
      play.open += openVelocity * s;
      if (play.open < 0) { play.open = 0; openVelocity *= -0.25; }
      if (play.open > 1) { play.open = 1; openVelocity = 0; }
      const follow = (rate: number) => 1 - Math.exp(-s * rate);
      play.lift += (liftTarget - play.lift) * follow(10);
      play.press += (pressTarget - play.press) * follow(28);
      play.lean = { x: play.lean.x + (leanTarget.x - play.lean.x) * follow(9), y: play.lean.y + (leanTarget.y - play.lean.y) * follow(9) };
      play.bloom += (bloomTarget - play.bloom) * follow(bloomTarget ? 3.4 : 2.2);
      energy *= Math.exp(-0.2 * s);
      const moving = Math.abs(openVelocity) > 1e-3 || play.open > 1e-3 || spinVelocity !== 0 || Boolean(dragging)
        || Math.abs(liftTarget - play.lift) + Math.abs(pressTarget - play.press) > 1e-3
        || Math.abs(leanTarget.x - play.lean.x) + Math.abs(leanTarget.y - play.lean.y) > 1e-3
        || Math.abs(bloomTarget - play.bloom) > 1e-3;
      if (!moving) {
        // Settled: snap to exact rest so nothing lingers into the story.
        Object.assign(play, { open: 0, bloom: bloomTarget, lift: liftTarget, press: pressTarget, lean: { ...leanTarget } });
        openVelocity = 0;
        if (!bloomTarget) play.spin = 0;
      }
      return moving;
    };

    const buzz = (pattern: number | number[]) => { if (dragging?.touch) navigator.vibrate?.(pattern); };

    // Enough turning and pressing opens the whole idea: the dials lock into the C, the seed
    // reaches the gap. It holds for a moment, then folds back into the seed.
    const addEnergy = (amount: number) => {
      energy += amount;
      if (energy < BLOOM_SPIN || bloomTarget) return;
      energy = 0;
      bloomTarget = 1;
      spinVelocity *= 0.2;
      buzz([10, 60, 14]);
      clearTimeout(bloomTimer);
      bloomTimer = window.setTimeout(() => { bloomTarget = 0; request(); }, BLOOM_HOLD);
    };

    /** Pointer relative to the seed's centre, in px, with the seed's rest radius. */
    const fromSeed = (event: PointerEvent) => {
      const box = pin.getBoundingClientRect();
      const dx = event.clientX - box.left - seedPx.x, dy = event.clientY - box.top - seedPx.y;
      return { dx, dy, distance: Math.hypot(dx, dy), r: seedPx.r, angle: Math.atan2(-dy, dx) * 180 / Math.PI };
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
      const settling = settlePlay(dt / 1000);
      apply(shown);
      const moving = settling || Math.abs(target - shown) > 1e-4 || Math.abs(tiltTarget.x - tilt.x) + Math.abs(tiltTarget.y - tilt.y) > 1e-3;
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

    // Anywhere on the page: tilt (mouse), and the seed turning to face a nearby pointer.
    const onPointer = (event: PointerEvent) => {
      if (!inView) return;
      if (fine.matches) tiltTarget = { x: (event.clientX / window.innerWidth) * 2 - 1, y: (event.clientY / window.innerHeight) * 2 - 1 };
      if (playable() && (event.pointerType === 'mouse' || dragging?.id === event.pointerId)) {
        const { dx, dy, distance, r } = fromSeed(event);
        const near = smooth(1 - range(distance, r * 1.4, r * 4.5));
        leanTarget = { x: clamp(dx / (2.2 * r), -1, 1) * near, y: clamp(dy / (2.2 * r), -1, 1) * near };
        liftTarget = dragging ? 1 : smooth(1 - range(distance, r * 0.9, r * 2.4));
      }
      request();
    };
    // On the seed's own target: press, turn, let go. Pointer capture keeps the drag even when
    // it leaves the target; touch-action: none keeps a finger on the seed from scrolling.
    const onSeedDown = (event: PointerEvent) => {
      if (!playable() || event.button > 0) return;
      event.preventDefault();
      seedTarget?.setPointerCapture(event.pointerId);
      dragging = { id: event.pointerId, angle: fromSeed(event).angle, time: event.timeStamp, touch: event.pointerType !== 'mouse' };
      dragVelocity = 0;
      pressTarget = liftTarget = 1;
      openVelocity += 5.5; // a press pops the arcs out of the seed
      buzz(8);
      addEnergy(260);
      request();
    };
    const onSeedMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== dragging.id) return;
      // Turning round the seed turns the dials with the pointer, like a combination lock.
      const { angle } = fromSeed(event);
      const delta = ((angle - dragging.angle + 540) % 360) - 180;
      const seconds = Math.max(0.008, (event.timeStamp - dragging.time) / 1000);
      play.spin += delta;
      dragVelocity = dragVelocity * 0.6 + (delta / seconds) * 0.4;
      spinVelocity = dragVelocity;
      dragging = { ...dragging, angle, time: event.timeStamp };
      addEnergy(Math.abs(delta));
      request();
    };
    const onSeedUp = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== dragging.id) return;
      // Let go mid-turn and the dials keep spinning; let go still and they stop.
      spinVelocity = event.timeStamp - dragging.time < 90 ? dragVelocity : 0;
      const touch = dragging.touch;
      dragging = undefined;
      pressTarget = 0;
      if (touch) { liftTarget = 0; leanTarget = { x: 0, y: 0 }; }
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
          dark: isDark(),
          onLost: () => { renderer?.dispose(); renderer = undefined; stage.dataset.gl = 'lost'; apply(shown); },
        });
        if (disposed) { created.dispose(); return; }
        renderer = created;
        measure();
        apply(shown);
        stage.dataset.gl = 'on';
        window.dispatchEvent(new CustomEvent('story:renderer', { detail: module.describe(canvas) }));
      } catch { stage.dataset.gl = 'off'; }
    };

    const onTheme = () => { renderer?.setTheme(isDark()); measure(); apply(shown); };

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
    window.addEventListener('themechange', onTheme);
    seedTarget?.addEventListener('pointerdown', onSeedDown);
    seedTarget?.addEventListener('pointermove', onSeedMove);
    seedTarget?.addEventListener('pointerup', onSeedUp);
    seedTarget?.addEventListener('pointercancel', onSeedUp);
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
      clearTimeout(bloomTimer);
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle); else clearTimeout(idle);
      intents.forEach(name => window.removeEventListener(name, start));
      cancelAnimationFrame(frame);
      visibility.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('themechange', onTheme);
      seedTarget?.removeEventListener('pointerdown', onSeedDown);
      seedTarget?.removeEventListener('pointermove', onSeedMove);
      seedTarget?.removeEventListener('pointerup', onSeedUp);
      seedTarget?.removeEventListener('pointercancel', onSeedUp);
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
    <canvas className="story-canvas" />
  </div>;
}
