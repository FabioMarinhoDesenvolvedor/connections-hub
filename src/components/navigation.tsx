'use client';

import { useEffect, useRef, useState } from 'react';
import { site } from '@/data/site';
import { Arrow } from './arrow';

export function Navigation() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // The bar takes the tone of the surface underneath it: navy sections turn it navy.
    const dark = [...document.querySelectorAll<HTMLElement>('[data-nav-theme="dark"]')];
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = 32;
      setScrolled(window.scrollY > 8);
      setDark(dark.some(section => { const r = section.getBoundingClientRect(); return r.top <= line && r.bottom >= line; }));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); };
  }, []);

  useEffect(() => {
    if (!open) return;
    // The page behind stays put while the menu is open.
    const root = document.documentElement;
    root.classList.add('menu-open');
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); }
    };
    const onResize = () => { if (window.innerWidth >= 900) setOpen(false); };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => { root.classList.remove('menu-open'); document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); };
  }, [open]);

  const close = () => setOpen(false);
  // The panel is a sibling of the header, not a child: the header's backdrop-filter would
  // otherwise become the containing block of the fixed panel and collapse it to the bar.
  return <>
  <header className="site-header" data-scrolled={scrolled || open} data-theme={dark && !open ? 'dark' : 'light'}>
    <div className="navigation shell">
      <a href="#inicio" className="brand-link" aria-label="Connections Hub — início" onClick={close}>
        {/* Official artwork, without filters, opacity or effects. */}
        <img className="logo-default" src="/brand/logo.svg" width="142" height="31" alt="Connections Hub" />
        <img className="logo-light" src="/brand/logo-light.svg" width="142" height="31" alt="" aria-hidden="true" />
      </a>
      <nav className="desktop-navigation" aria-label="Navegação principal">
        {site.navigation.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}
      </nav>
      <a className="button button-primary button-small header-contact" href="#contato">Fale conosco</a>
      <button ref={toggle} className="menu-toggle" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>
        <span /><span />
      </button>
    </div>
  </header>
  <nav id="mobile-navigation" className="mobile-navigation" aria-label="Navegação móvel" data-open={open} inert={!open} data-lenis-prevent>
      <div className="shell">
        {site.navigation.map((item, index) => <a key={item.href} href={item.href} onClick={close} style={{ '--i': index } as React.CSSProperties}>{item.label}</a>)}
        <a className="mobile-contact" href="#contato" onClick={close} style={{ '--i': site.navigation.length } as React.CSSProperties}>Fale conosco<Arrow diagonal /></a>
      </div>
  </nav>
  </>;
}
