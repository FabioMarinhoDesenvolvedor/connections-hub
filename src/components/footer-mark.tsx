'use client';

import { useEffect, useRef } from 'react';
import type { FooterScene } from '@/lib/footer-scene';

const DURATION = 3600;

/*
  The footer signature. The official SVG is always in the page (readable without
  JavaScript or WebGL); where WebGL is available, the name first assembles in 3D over it.
  The footer is the end of the page, so there is too little scroll to drive the assembly:
  it plays once the signature is in view, and replays after the footer has left the screen.
*/
export function FooterMark() {
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const element = wrap.current;
    const host = stage.current;
    const mark = image.current;
    if (!element || !host || !mark) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(pointer: fine)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const eligible = () => !reduced.matches && !connection?.saveData && (navigator.hardwareConcurrency || 4) > 2;
    let scene: FooterScene | undefined;
    let cancelled = false;
    let frame = 0;
    let startedAt = 0;
    let played = false;

    const play = (now: number) => {
      const t = Math.min(1, (now - startedAt) / DURATION);
      scene?.setProgress(t);
      frame = t < 1 ? requestAnimationFrame(play) : 0;
    };
    const onFrame = (p: number) => {
      element.style.setProperty('--mark', p.toFixed(4));
      element.dataset.landed = String(p >= 0.9);
    };
    const onPointer = (event: PointerEvent) => scene?.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);

    const load = async () => {
      if (scene || !eligible()) return;
      try {
        const { createFooterScene } = await import('@/lib/footer-scene');
        if (cancelled) return;
        scene = createFooterScene(host, mark, { compact: !fine.matches || window.innerWidth < 768, onFrame });
        element.dataset.mode = '3d';
        watch.observe(element);
      } catch {
        delete element.dataset.mode;
      }
    };
    // Load ahead of arrival so the letters are ready before the footer is seen.
    const near = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { near.disconnect(); load(); } }, { rootMargin: '900px 0px' });
    near.observe(element);
    // Play when most of the signature is visible; reset once it is fully off screen.
    const watch = new IntersectionObserver(([entry]) => {
      if (!scene) return;
      if (entry.intersectionRatio >= 0.6 && !played) {
        played = true;
        startedAt = performance.now();
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(play);
      } else if (!entry.isIntersecting && played) {
        played = false;
        cancelAnimationFrame(frame);
        frame = 0;
        scene.reset();
      }
    }, { threshold: [0, 0.6] });
    if (fine.matches) window.addEventListener('pointermove', onPointer, { passive: true });
    return () => {
      cancelled = true;
      near.disconnect();
      watch.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointer);
      scene?.dispose();
    };
  }, []);

  // Manual p.14: the horizontal logo is reserved for signature use. On navy, the official
  // sand + orange version keeps the o's legible.
  return <div className="footer-mark" ref={wrap} data-reveal>
    <img ref={image} src="/brand/signature-sand.svg" width="2978" height="296" alt="Connections Hub" loading="lazy" />
    <div className="footer-mark-stage" ref={stage} aria-hidden="true" />
  </div>;
}
