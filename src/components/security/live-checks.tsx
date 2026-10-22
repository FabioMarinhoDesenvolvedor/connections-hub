'use client';

import { useEffect, useRef, useState } from 'react';
import type { LiveCheckId, LiveCopy } from '@/i18n/types';
import { securityHeaders } from '@/lib/security-headers';

/*
  Each rule the section states, checked live: the page asks its own origin for the headers
  this very page was served with (a same-origin HEAD request) and shows what arrived. The
  "nothing collected" card counts the page's cookies and any resource loaded from another
  origin. Before the check runs (and without JavaScript) each card shows the configured value.
*/
type Check = { id: LiveCheckId; header: string; find: (headers: Headers) => string | null };

const pick = (name: string, part?: string) => (headers: Headers) => {
  const value = headers.get(name);
  if (!value) return null;
  if (!part) return value;
  return value.split(';').map(s => s.trim()).find(s => s.startsWith(part)) ?? null;
};
const CHECKS: Check[] = [
  { id: 'hsts', header: 'Strict-Transport-Security', find: pick('strict-transport-security') },
  { id: 'csp', header: 'Content-Security-Policy', find: pick('content-security-policy', 'default-src') },
  { id: 'frame', header: 'Content-Security-Policy', find: pick('content-security-policy', 'frame-ancestors') },
  { id: 'nosniff', header: 'X-Content-Type-Options', find: pick('x-content-type-options') },
  { id: 'permissions', header: 'Permissions-Policy', find: pick('permissions-policy') },
];
// What the server is configured to send, for the first paint.
const configured = (() => {
  const headers = new Headers(securityHeaders().map(h => [h.key, h.value] as [string, string]));
  return Object.fromEntries(CHECKS.map(c => [c.id, c.find(headers)])) as Record<LiveCheckId, string | null>;
})();

type Result = { value: string | null; state: 'configured' | 'ok' | 'missing' };

export function LiveChecks({ copy }: { copy: LiveCopy }) {
  const root = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<Record<LiveCheckId, Result>>(() => ({
    ...Object.fromEntries(CHECKS.map(c => [c.id, { value: configured[c.id], state: 'configured' }])),
    data: { value: null, state: 'configured' },
  }) as Record<LiveCheckId, Result>);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let done = false;
    const run = async () => {
      done = true;
      try {
        const response = await fetch(window.location.pathname, { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' });
        const next = {} as Record<LiveCheckId, Result>;
        for (const c of CHECKS) { const value = c.find(response.headers); next[c.id] = { value, state: value ? 'ok' : 'missing' }; }
        const cookies = document.cookie ? document.cookie.split(';').length : 0;
        const third = performance.getEntriesByType('resource').filter(r => new URL(r.name, location.href).origin !== location.origin).length;
        next.data = { value: copy.dataValue.replace('{cookies}', String(cookies)).replace('{third}', String(third)), state: cookies === 0 && third === 0 ? 'ok' : 'missing' };
        setResults(next);
      } catch { /* keep the configured values */ }
    };
    const seen = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && !done) { seen.disconnect(); run(); } }, { rootMargin: '200px 0px' });
    seen.observe(el);
    return () => seen.disconnect();
  }, [copy.dataValue]);

  const ids: LiveCheckId[] = ['hsts', 'csp', 'frame', 'nosniff', 'permissions', 'data'];
  return <div className="live" ref={root}>
    <header className="live-head">
      <h3 className="live-label"><span className="point" aria-hidden="true" />{copy.label}</h3>
      <p>{copy.note}</p>
    </header>
    <ul className="live-grid">
      {ids.map(id => {
        const result = results[id];
        const check = CHECKS.find(c => c.id === id);
        return <li key={id} className="live-card" data-state={result.state}>
          <p className="live-header">{check ? check.header : 'document.cookie · Resource Timing'}</p>
          <h4>{copy.items[id].title}</h4>
          <p className="live-text">{copy.items[id].text}</p>
          <p className="live-value"><code>{result.value ?? '—'}</code></p>
          <p className="live-state"><span aria-hidden="true" />{result.state === 'ok' ? copy.ok : result.state === 'missing' ? copy.missing : copy.configured}</p>
        </li>;
      })}
    </ul>
  </div>;
}
