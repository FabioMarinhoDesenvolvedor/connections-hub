'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

/*
  Wheel smoothing only. The document still scrolls natively (window.scrollTo),
  so sticky, scroll events, keyboard, find-in-page and touch behave as usual.
  Touch devices and reduced-motion users keep the platform's own scrolling.
*/
export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(pointer: fine)');
    if (reduced.matches || !fine.matches) return;
    const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 64;
    const lenis = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.9,
      autoRaf: true,
      anchors: { offset: -nav },
    });
    const onPreference = () => { if (reduced.matches) lenis.destroy(); };
    reduced.addEventListener('change', onPreference);
    return () => { reduced.removeEventListener('change', onPreference); lenis.destroy(); };
  }, []);
  return null;
}
