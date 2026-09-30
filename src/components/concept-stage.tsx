'use client';

import { useEffect, useRef } from 'react';
import type { ConceptScene } from '@/lib/concept-scene';

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
const ease = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// Where the C sits inside the official lockup (logo.svg viewBox 1407.79 × 311.32),
// measured by rasterising the file: ring centre and ring radius.
const LOCKUP = { width: 1407.79, height: 311.32, cx: 140.3, cy: 169.44, radius: 79.3 };
// Scroll length of the story in viewports: hero, three concept chapters, and a finale
// twice as long, where the hub assembles. Kept here so Three.js stays out of this chunk.
const CHAPTERS = 5;

/*
  Drives the concept story from native scroll. The section publishes its position
  in chapters as --chapter; the WebGL scene is an enhancement loaded after first paint. Without
  it, the SVG below tells the same story with the same proportions.
*/
export function ConceptStage() {
  const stage = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const element = stage.current;
    const host = mount.current;
    const section = element?.closest<HTMLElement>('[data-story]');
    if (!element || !host || !section) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(pointer: fine)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const ring = svg.current?.querySelector<SVGCircleElement>('[data-ring]');
    const dot = svg.current?.querySelector<SVGCircleElement>('[data-dot]');
    const lockup = section.querySelector<HTMLElement>('.story-lockup');
    let scene: ConceptScene | undefined;
    let cancelled = false;
    let frame = 0;

    // HTML half of the finale, in chapter units. With WebGL, the 3D hub lands face-on on
    // the symbol, the SVG appears under it (pixel-identical) and the canvas steps aside.
    // Without WebGL, the symbol opens as a circle from its centre after the flat drawing.
    const handover = (c: number) => {
      const webgl = Boolean(scene);
      const set = (name: string, value: number) => section.style.setProperty(name, value.toFixed(4));
      // With WebGL the whole lockup is built in 3D; the SVG only appears under it at the end.
      const under = c >= 4.8 ? 1 : 0;
      set('--grow', webgl ? under : easeOut(range(c, 3.5, 3.85)));
      set('--handoff', webgl ? range(c, 4.88, 4.93) : 1);
      set('--line-1', webgl ? under : easeOut(range(c, 3.8, 4.04)));
      set('--line-2', webgl ? under : easeOut(range(c, 3.88, 4.12)));
      set('--final', ease(range(c, webgl ? 4.9 : 4, webgl ? 5 : 4.3)));
    };

    const drawFallback = (c: number) => {
      if (!ring || !dot) return;
      const open = range(c, 1.2, 2.08);
      const split = range(c, 2.24, 2.88);
      const arrive = range(c, 2.52, 3.2);
      // Stroke-centred circle: a seed is a ring whose width equals its diameter.
      const radius = 0.54 + 0.46 * open;
      const width = 1.08 + (0.364 - 1.08) * open;
      // Same gap as the scene (0.967 rad above, 0.984 rad below the horizontal), in user units.
      const circumference = Math.PI * 2 * radius;
      ring.setAttribute('r', String(radius));
      ring.style.strokeWidth = String(width);
      ring.style.strokeDasharray = split > 0 ? `${circumference - 1.951 * radius * split} ${circumference}` : 'none';
      ring.style.strokeDashoffset = String(-0.967 * radius * split);
      dot.style.opacity = String(arrive);
      dot.setAttribute('cx', String(1.029 + (1 - arrive) * 0.9));
      dot.setAttribute('cy', String(-0.271 + (1 - arrive) * 0.5));
    };

    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      let c = (total > 0 ? clamp(-rect.top / total) : 0) * CHAPTERS;
      if (reduced.matches) c = Math.round(c);
      section.style.setProperty('--chapter', c.toFixed(4));
      section.dataset.chapter = String(Math.round(c));
      if (!scene) handover(c);
      if (scene && lockup) {
        const box = lockup.getBoundingClientRect();
        const stageBox = element.getBoundingClientRect();
        const unit = box.width / LOCKUP.width;
        scene.setLanding({ x: box.left - stageBox.left + LOCKUP.cx * unit, y: box.top - stageBox.top + LOCKUP.cy * unit, radius: LOCKUP.radius * unit });
      }
      scene?.setProgress(c);
      drawFallback(c);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const onPointer = (event: PointerEvent) => {
      scene?.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
    };

    const eligible = () => !reduced.matches && !connection?.saveData && (navigator.hardwareConcurrency || 4) > 2;
    const load = async () => {
      if (!eligible() || scene) return;
      try {
        // Keeps Three.js out of the initial bundle; the hero paints without it.
        const { createConceptScene } = await import('@/lib/concept-scene');
        if (cancelled || !eligible()) return;
        scene = createConceptScene(host, { compact: !fine.matches || window.innerWidth < 768, onFrame: handover });
        update();
      } catch {
        host.dataset.ready = 'false';
      }
    };
    const hasIdle = typeof window.requestIdleCallback === 'function';
    const idle = hasIdle ? window.requestIdleCallback(load, { timeout: 1200 }) : setTimeout(load, 300);
    const onPreference = () => {
      if (!eligible()) { scene?.dispose(); scene = undefined; } else load();
      update();
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    if (fine.matches) window.addEventListener('pointermove', onPointer, { passive: true });
    reduced.addEventListener('change', onPreference);
    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(idle as number); else clearTimeout(idle);
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('pointermove', onPointer);
      reduced.removeEventListener('change', onPreference);
      scene?.dispose();
    };
  }, []);

  return <div className="concept-stage" ref={stage} aria-hidden="true">
    <svg ref={svg} className="concept-fallback" viewBox="-1.6 -1.6 3.2 3.2">
      <g transform="scale(1,-1)">
        <circle data-ring cx="0" cy="0" r="0.54" />
        <circle data-dot cx="1.029" cy="-0.271" r="0.183" />
      </g>
    </svg>
    <div className="concept-webgl" ref={mount} />
  </div>;
}
