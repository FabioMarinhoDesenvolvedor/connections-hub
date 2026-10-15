'use client';

import { useEffect, useState } from 'react';
import { applyTheme, currentTheme, otherTheme, saveTheme, type Theme } from '@/lib/theme';
import type { MiniProps } from './types';

export type HeroCopy = { eyebrow: string; lines: [string, string]; lead: string; primary: string; secondary: string };
type Locale = 'pt' | 'en' | 'ja';

/*
  This website, in miniature, drawn with the site's own tokens. The language chips switch
  the miniature between the three generated versions; the theme button switches the real
  page, so the whole drawing (and every other interface here) changes with it.
*/
export function ConnectionsMini({ act, hero, locale }: MiniProps & { hero: Record<Locale, HeroCopy>; locale: Locale }) {
  const [lang, setLang] = useState<Locale>(locale);
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => {
    setTheme(currentTheme());
    const onChange = (event: Event) => setTheme((event as CustomEvent<Theme>).detail);
    window.addEventListener('themechange', onChange);
    return () => window.removeEventListener('themechange', onChange);
  }, []);
  const copy = hero[lang];
  const pick = (next: Locale, from: HTMLElement) => { act(next, from); setLang(next); };
  const flip = (from: HTMLElement) => {
    const next = otherTheme(currentTheme());
    act('theme', from, { theme: next });
    saveTheme(next);
    applyTheme(next);
  };

  return <div className="mini mini-ch" lang={lang === 'pt' ? 'pt-BR' : lang}>
    <header className="ch-bar">
      <img className="ch-logo" src={theme === 'dark' ? '/brand/logo-light.svg' : '/brand/logo.svg'} alt="Connections Hub" width={142} height={31} />
      <span className="ch-langs">
        {(['pt', 'en', 'ja'] as const).map(l => <button key={l} type="button" data-flow={l} aria-pressed={l === lang} onClick={event => pick(l, event.currentTarget)}>{l.toUpperCase()}</button>)}
      </span>
      <button type="button" className="ch-theme" data-flow="theme" aria-label={theme === 'dark' ? 'Light theme' : 'Dark theme'} onClick={event => flip(event.currentTarget)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" /></svg>
      </button>
    </header>
    <div className="ch-hero">
      <div>
        <p className="ch-eyebrow"><i />{copy.eyebrow}</p>
        <h4><span>{copy.lines[0]}</span><span>{copy.lines[1]}</span></h4>
        <p className="ch-lead">{copy.lead}</p>
        <p className="ch-ctas"><span>{copy.primary}</span><span>{copy.secondary}</span></p>
      </div>
      <span className="ch-seed" aria-hidden="true"><i /><i /><b /></span>
    </div>
  </div>;
}
