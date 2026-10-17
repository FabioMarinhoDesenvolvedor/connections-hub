'use client';

import { useEffect, useState } from 'react';

const KEY = 'privacy-notice';

/*
  A fixed note for first-time visitors: the site collects no personal data. Shown until it is
  dismissed; the dismissal is remembered in this browser only (same place as the theme).
  If storage is unavailable (private mode), it simply shows again on the next visit.
*/
export function PrivacyNotice({ t }: { t: { label: string; text: string; dismiss: string } }) {
  const [state, setState] = useState<'hidden' | 'shown' | 'leaving'>('hidden');

  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(KEY) === '1'; } catch {}
    if (seen) return;
    // After the opening has started, so it never competes with the first paint.
    const timer = window.setTimeout(() => setState('shown'), 1400);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(KEY, '1'); } catch {}
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setState('hidden'); return; }
    setState('leaving');
    window.setTimeout(() => setState('hidden'), 320);
  };

  if (state === 'hidden') return null;
  return <aside className="privacy-notice" data-state={state} role="region" aria-label={t.label}>
    <p className="privacy-notice-label"><span className="point" aria-hidden="true" />{t.label}</p>
    <p className="privacy-notice-text">{t.text}</p>
    <button type="button" className="button button-secondary button-small" onClick={dismiss}>{t.dismiss}</button>
  </aside>;
}
