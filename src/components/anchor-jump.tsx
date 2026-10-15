'use client';

import { useEffect } from 'react';

const FAR = 1.5;    // viewports: beyond this a link cuts instead of scrolling
const FADE = 150;   // ms, matches .is-jumping in globals.css

/*
  In-page links. A short hop scrolls smoothly (html { scroll-behavior: smooth }); a long one
  would scroll through every pinned scene on the way (the story, the services) and play
  them all, so it cuts instead: the page fades out, jumps, and fades back in at the section.
*/
export function AnchorJump() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer = 0;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      const id = link?.getAttribute('href')?.slice(1);
      const target = id ? document.getElementById(decodeURIComponent(id)) : null;
      if (!target) return;
      const distance = Math.abs(target.getBoundingClientRect().top);
      if (distance < window.innerHeight * FAR) return;
      event.preventDefault();
      const root = document.documentElement;
      const land = () => {
        target.scrollIntoView({ behavior: 'instant', block: 'start' });
        history.pushState(null, '', `#${id}`);
        requestAnimationFrame(() => root.classList.remove('is-jumping'));
      };
      clearTimeout(timer);
      if (reduced.matches) { land(); return; }
      root.classList.add('is-jumping');
      timer = window.setTimeout(land, FADE);
    };
    document.addEventListener('click', onClick);
    return () => { clearTimeout(timer); document.removeEventListener('click', onClick); };
  }, []);
  return null;
}
