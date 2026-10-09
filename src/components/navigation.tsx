'use client';

import { useEffect, useRef, useState } from 'react';
import type { Dictionary, Locale } from '@/i18n';
import { localeInfo, locales } from '@/i18n/config';
import { Arrow } from './arrow';
import { ThemeToggle } from './theme-toggle';

const NAV_LINE = 40; // px from the top where the bar samples the surface underneath

type Props = { locale: Locale; t: Pick<Dictionary, 'ui' | 'nav'> };

/** The three languages, each named in its own language; the current one is not a link. */
function Languages({ locale, label, onPick }: { locale: Locale; label: string; onPick?: () => void }) {
  return <nav className="languages" aria-label={label}>
    {locales.map(l => l === locale
      ? <span key={l} aria-current="true" lang={localeInfo[l].html} title={localeInfo[l].label}>{localeInfo[l].short}</span>
      : <a key={l} href={localeInfo[l].path} hrefLang={localeInfo[l].html} lang={localeInfo[l].html} title={localeInfo[l].label} onClick={onPick}>
        <span aria-hidden="true">{localeInfo[l].short}</span><span className="sr-only">{localeInfo[l].label}</span>
      </a>)}
  </nav>;
}

export function Navigation({ locale, t }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);
  const [active, setActive] = useState('');
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // The bar takes the tone of the surface beneath it, and marks the section being read.
    const darkSurfaces = [...document.querySelectorAll<HTMLElement>('[data-nav-theme="dark"]')];
    const sections = t.nav.map(item => document.querySelector<HTMLElement>(item.href)).filter((s): s is HTMLElement => Boolean(s));
    const story = document.querySelector<HTMLElement>('[data-story]');
    let frame = 0;
    const update = () => {
      frame = 0;
      // Over the story's own paper the bar stays bare: no surface, and no backdrop blur
      // recomputed every frame over the moving 3D canvas.
      // Only the pinned stage keeps it bare; the static story (reduced motion, short screens) scrolls like any section.
      const overStory = Boolean(story && story.dataset.mode === 'pinned' && story.getBoundingClientRect().bottom > NAV_LINE);
      setScrolled(window.scrollY > 8 && !overStory);
      setDark(darkSurfaces.some(s => { const r = s.getBoundingClientRect(); return r.top <= NAV_LINE && r.bottom >= NAV_LINE; }));
      const middle = window.innerHeight * 0.4;
      const current = sections.find(s => { const r = s.getBoundingClientRect(); return r.top <= middle && r.bottom > middle; });
      setActive(current ? `#${current.id}` : '');
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [t.nav]);

  useEffect(() => {
    if (!open) return;
    // The page behind stays put and out of the focus order while the menu is open.
    const root = document.documentElement;
    root.classList.add('menu-open');
    const background = [...document.querySelectorAll<HTMLElement>('main, .site-footer')];
    const previousInert = background.map(element => element.inert);
    background.forEach(element => { element.inert = true; });
    const links = [...document.querySelectorAll<HTMLElement>('#mobile-navigation a, #mobile-navigation button')];
    links[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); }
      if (event.key === 'Tab') {
        const controls = [toggle.current, ...links].filter((item): item is HTMLElement => Boolean(item));
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    const onResize = () => { if (window.innerWidth >= 900) setOpen(false); };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      root.classList.remove('menu-open');
      background.forEach((element, i) => { element.inert = previousInert[i]; });
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const close = () => setOpen(false);
  // The panel is a sibling of the header: the header's backdrop-filter would otherwise
  // become the containing block of the fixed panel and collapse it to the bar.
  return <>
    <header className="site-header" data-scrolled={scrolled || open} data-theme={dark && !open ? 'dark' : 'light'}>
      <div className="navigation shell">
        <a href="#inicio" className="brand-link" aria-label={t.ui.home} onClick={close}>
          {/* Official artwork, unaltered: navy on light surfaces, the light version on navy. */}
          <img className="logo-default" src="/brand/logo.svg" width="142" height="31" alt="" />
          <img className="logo-light" src="/brand/logo-light.svg" width="142" height="31" alt="" />
        </a>
        <nav className="desktop-navigation" aria-label={t.ui.mainNav}>
          {t.nav.map(item => <a key={item.href} href={item.href} aria-current={active === item.href ? 'location' : undefined}>{item.label}</a>)}
        </nav>
        <div className="header-tools">
          <Languages locale={locale} label={t.ui.language} />
          <ThemeToggle labels={t.ui.theme} />
        </div>
        <a className="button button-primary button-small header-contact" href="#contato">{t.ui.contactShort}</a>
        <button ref={toggle} className="menu-toggle" aria-label={open ? t.ui.closeMenu : t.ui.openMenu} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>
          <span /><span />
        </button>
      </div>
    </header>
    <nav id="mobile-navigation" className="mobile-navigation" aria-label={t.ui.mobileNav} data-open={open} inert={!open}>
      <div className="shell">
        {t.nav.map((item, index) => <a key={item.href} href={item.href} onClick={close} style={{ '--i': index } as React.CSSProperties}>{item.label}</a>)}
        <a className="mobile-contact" href="#contato" onClick={close} style={{ '--i': t.nav.length } as React.CSSProperties}>{t.ui.contactShort}<Arrow /></a>
        <div className="mobile-tools" style={{ '--i': t.nav.length + 1 } as React.CSSProperties}>
          <Languages locale={locale} label={t.ui.language} onPick={close} />
          <ThemeToggle labels={t.ui.theme} />
        </div>
      </div>
    </nav>
  </>;
}
