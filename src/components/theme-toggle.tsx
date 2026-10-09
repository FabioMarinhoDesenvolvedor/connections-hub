'use client';

import { useEffect, useState } from 'react';
import { applyTheme, currentTheme, otherTheme, savedTheme, saveTheme, startViewTransition, type Theme } from '@/lib/theme';

/*
  Light ↔ dark from the bar. The icon is drawn by CSS from html[data-theme], so the server
  markup never disagrees with the page. Where the browser supports view transitions, the
  new theme opens as a circle from the button, like the seed opening; otherwise it swaps.
  (The pull-tab on the page edge, theme-peel.tsx, is the other way to switch.)
*/
export function ThemeToggle({ labels, className = '' }: { labels: { toDark: string; toLight: string }; className?: string }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setTheme(currentTheme());
    const onChange = (event: Event) => setTheme((event as CustomEvent<Theme>).detail);
    // Without a saved choice, the page keeps following the system.
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystem = () => { if (!savedTheme()) applyTheme(system.matches ? 'dark' : 'light'); };
    window.addEventListener('themechange', onChange);
    system.addEventListener('change', onSystem);
    return () => { window.removeEventListener('themechange', onChange); system.removeEventListener('change', onSystem); };
  }, []);

  const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const next = otherTheme(currentTheme());
    saveTheme(next);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { applyTheme(next); return; }
    const box = event.currentTarget.getBoundingClientRect();
    const x = box.left + box.width / 2, y = box.top + box.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transition = startViewTransition(() => applyTheme(next));
    if (!transition) { applyTheme(next); return; }
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 620, easing: 'cubic-bezier(.16, 1, .3, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    }).catch(() => {});
  };

  return <button type="button" className={`theme-toggle ${className}`} onClick={toggle}
    aria-label={theme === 'dark' ? labels.toLight : labels.toDark} aria-pressed={theme === 'dark'}>
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {/* The seed and its light side: a ring with one half filled. */}
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path className="theme-toggle-half" d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" />
    </svg>
  </button>;
}
