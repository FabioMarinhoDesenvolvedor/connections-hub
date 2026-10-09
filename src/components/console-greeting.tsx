'use client';

import { useEffect } from 'react';
import { version as reactVersion } from 'react';
import { credits } from '@/data/site';
import { localeInfo, type Locale } from '@/i18n/config';

/*
  For whoever opens the developer tools: the symbol in text, then what this page actually
  is and how it performed in *this* visit, measured by the browser (Navigation Timing, Paint
  Timing, LCP and Layout Shift entries, Resource Timing). The 3D line arrives when the
  renderer starts. Everything is also available live as window.hub.stats().
*/
const ART = [
  '    ▄▄██████▄▄',
  '  ▄██▀▀    ▀▀██▄',
  ' ███          ▀▀',
  ' ██            ●',
  ' ███          ▄▄',
  '  ▀██▄▄    ▄▄██▀',
  '    ▀▀██████▀▀',
].join('\n');

const kb = (bytes: number) => `${Math.round(bytes / 1024)} kB`;
const ms = (value?: number) => (value === undefined ? '—' : `${Math.round(value)} ms`);

type Vitals = { lcp?: number; cls: number };

function measure(vitals: Vitals) {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime;
  const bytes = { script: 0, css: 0, font: 0, img: 0, other: 0 };
  for (const entry of performance.getEntriesByType('resource') as PerformanceResourceTiming[]) {
    const type = entry.initiatorType === 'script' ? 'script'
      : entry.initiatorType === 'link' && /\.css(\?|$)/.test(entry.name) ? 'css'
      : /\.(woff2?|ttf|otf)(\?|$)/.test(entry.name) ? 'font'
      : entry.initiatorType === 'img' || /\.(avif|webp|png|jpe?g|svg)(\?|$)/.test(entry.name) ? 'img' : 'other';
    bytes[type] += entry.transferSize || 0;
  }
  const stage = document.querySelector<HTMLElement>('.story-stage')?.dataset;
  return {
    build: process.env.NEXT_PUBLIC_BUILD_COMMIT,
    builtAt: process.env.NEXT_PUBLIC_BUILD_TIME,
    next: process.env.NEXT_PUBLIC_NEXT_VERSION,
    react: reactVersion,
    ttfb: nav ? Math.round(nav.responseStart - nav.startTime) : undefined,
    fcp: fcp === undefined ? undefined : Math.round(fcp),
    lcp: vitals.lcp === undefined ? undefined : Math.round(vitals.lcp),
    cls: Number(vitals.cls.toFixed(3)),
    html: nav?.transferSize ?? 0,
    ...bytes,
    gl: stage?.gl ?? 'pending',
    gpuMs: stage?.gpu ? Number(stage.gpu) : undefined,
    renderScale: stage?.scale ? Number(stage.scale) : undefined,
    framesDrawn: stage?.frames ? Number(stage.frames) : 0,
    theme: document.documentElement.dataset.theme,
    dpr: window.devicePixelRatio,
    cores: navigator.hardwareConcurrency,
  };
}

export function ConsoleGreeting({ locale, signature }: { locale: Locale; signature: string }) {
  useEffect(() => {
    const scope = window as unknown as { __hubGreeted?: boolean; hub?: object };
    const vitals: Vitals = { cls: 0 };
    const observers: PerformanceObserver[] = [];
    const watch = (type: string, take: (entry: PerformanceEntry) => void) => {
      try {
        const observer = new PerformanceObserver(list => list.getEntries().forEach(take));
        observer.observe({ type, buffered: true });
        observers.push(observer);
      } catch { /* entry type not supported in this browser */ }
    };
    watch('largest-contentful-paint', entry => { vitals.lcp = entry.startTime; });
    watch('layout-shift', entry => { const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean }; if (!shift.hadRecentInput) vitals.cls += shift.value; });

    scope.hub = { stats: () => { const data = measure(vitals); console.table(data); return data; } };

    const font = 'font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;';
    const dim = `${font} color:#6B7C8E;`;
    const text = `${font} color:inherit;`;

    const print = () => {
      if (scope.__hubGreeted) return;
      scope.__hubGreeted = true;
      const m = measure(vitals);
      const built = m.builtAt ? new Date(m.builtAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '';
      console.log(
        `%c${ART}\n\n%cconnections hub%c  build ${m.build} · ${built}\n\n`
        + `%cvitals  %cTTFB ${ms(m.ttfb)} · FCP ${ms(m.fcp)} · LCP ${ms(m.lcp)} · CLS ${m.cls.toFixed(3)}\n`
        + `%cbytes   %chtml ${kb(m.html)} · js ${kb(m.script)} · css ${kb(m.css)} · fonts ${kb(m.font)} · images ${kb(m.img)}\n`
        + `%cstack   %cNext.js ${m.next} · React ${m.react} · three.js loaded on demand · hand-written CSS, no UI kit\n`
        + `%cruntime %c${localeInfo[locale].html} · ${m.theme} theme · DPR ${m.dpr} · ${m.cores ?? '?'} cores\n`
        + `%capi     %cwindow.hub.stats()\n\n`
        + `%c${signature}: ${credits.name} · ${credits.href}`,
        `${font} color:#C16042; line-height:1.15;`,
        `${font} color:#C16042; font-weight:700;`, dim,
        dim, text, dim, text, dim, text, dim, text, dim, text,
        dim,
      );
    };
    // When the 3D stage starts (on the reader's first scroll or pointer move), one more line.
    const onRenderer = (event: Event) => {
      const info = (event as CustomEvent<{ api: string; gpu: string; three: string }>).detail;
      window.setTimeout(() => {
        const stage = document.querySelector<HTMLElement>('.story-stage')?.dataset;
        console.log(`%crender  %c${info.api} · ${info.gpu} · three ${info.three} · ${stage?.gpu ? `${stage.gpu} ms GPU/frame` : 'GPU timer unavailable'} · scale ${stage?.scale ?? '1.00'}`, dim, text);
      }, 2500);
    };
    window.addEventListener('story:renderer', onRenderer);

    // After load, once the largest paint has had a chance to settle.
    let timer = 0;
    const later = () => { timer = window.setTimeout(print, 1800); };
    if (document.readyState === 'complete') later(); else window.addEventListener('load', later, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('load', later);
      window.removeEventListener('story:renderer', onRenderer);
      observers.forEach(observer => observer.disconnect());
    };
  }, [locale, signature]);
  return null;
}
