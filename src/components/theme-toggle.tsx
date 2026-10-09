'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const COLOURS: Record<Theme, string> = { light: '#F8F6F0', dark: '#20252B' };

const current = (): Theme => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

function apply(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach(meta => { meta.content = COLOURS[theme]; });
  window.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
}

/*
  Light ↔ dark. The first paint already has the right theme (inline script in the layout);
  this only switches it. The icon is drawn by CSS from html[data-theme], so the server
  markup never disagrees with the page. Where the browser supports view transitions, the
  new theme opens as a circle from the button, like the seed opening; otherwise it swaps.
*/
export function ThemeToggle({ labels, className = '' }: { labels: { toDark: string; toLight: string }; className?: string }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setTheme(current());
    const onChange = (event: Event) => setTheme((event as CustomEvent<Theme>).detail);
    // Without a saved choice, the page keeps following the system.
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystem = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem('theme'); } catch {}
      if (saved !== 'light' && saved !== 'dark') apply(system.matches ? 'dark' : 'light');
    };
    window.addEventListener('themechange', onChange);
    system.addEventListener('change', onSystem);
    return () => { window.removeEventListener('themechange', onChange); system.removeEventListener('change', onSystem); };
  }, []);

  const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const next: Theme = current() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', next); } catch {}
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const doc = document as Document & { startViewTransition?: (update: () => void) => { ready: Promise<void> } };
    if (reduced || !doc.startViewTransition) { apply(next); return; }
    const box = event.currentTarget.getBoundingClientRect();
    const x = box.left + box.width / 2, y = box.top + box.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transition = doc.startViewTransition(() => apply(next));
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
