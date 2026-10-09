'use client';

import { useEffect } from 'react';

/*
  The site's only motion primitive. One passive scroll listener, one rAF:
  - [data-reveal] gets .is-in once it enters the viewport;
  - [data-draw] gets .is-drawn once 45% of it is visible (technical drawings);
  - [data-progress] receives --progress (0 → 1) while it crosses the viewport,
    from its top at data-start × viewport to its bottom at data-end × viewport;
  - [data-spy] marks the child closest to the viewport centre as data-active.
  Content is fully visible without JavaScript; styles only animate under .motion.
*/
export function ScrollEffects() {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!reduced.matches) root.classList.add('motion');
    const onPreference = () => { root.classList.toggle('motion', !reduced.matches); schedule(); };

    const reveal = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        reveal.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -12% 0px' });
    document.querySelectorAll('[data-reveal]').forEach(element => reveal.observe(element));

    // Drawings draw themselves once most of the figure is on screen (the inline schematics on
    // phones; on wide screens the sticky plate draws per active service instead). A figure the
    // reader has already passed (fast scroll, a link further down) is drawn too, never left blank.
    const draw = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const passed = entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0);
        if (entry.intersectionRatio < 0.45 && !passed) continue;
        entry.target.classList.add('is-drawn');
        draw.unobserve(entry.target);
      }
    }, { threshold: [0, 0.45] });
    document.querySelectorAll('[data-draw]').forEach(element => draw.observe(element));

    const tracked = [...document.querySelectorAll<HTMLElement>('[data-progress]')];
    const spies = [...document.querySelectorAll<HTMLElement>('[data-spy]')];
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const element of tracked) {
        const rect = element.getBoundingClientRect();
        if (rect.bottom < -vh || rect.top > vh * 2) continue;
        const start = Number(element.dataset.start ?? 0.9) * vh;
        const end = Number(element.dataset.end ?? 0.5) * vh;
        const value = reduced.matches ? 1 : Math.min(1, Math.max(0, (start - rect.top) / (start - end + rect.height)));
        element.style.setProperty('--progress', value.toFixed(4));
      }
      for (const spy of spies) {
        const rect = spy.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) continue;
        let best: Element | undefined;
        let distance = Infinity;
        for (const child of spy.children) {
          const box = child.getBoundingClientRect();
          const d = Math.abs(box.top + box.height / 2 - vh * 0.5);
          if (d < distance) { distance = d; best = child; }
        }
        for (const child of spy.children) child.toggleAttribute('data-active', child === best);
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    reduced.addEventListener('change', onPreference);
    return () => {
      reveal.disconnect();
      draw.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      reduced.removeEventListener('change', onPreference);
      root.classList.remove('motion');
    };
  }, []);
  return null;
}
