'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { VaultCopy } from '@/i18n/types';
import type { Glyph, VaultRenderer } from '@/lib/cipher/renderer';
import { highlight } from '@/lib/highlight';
import { CSP_SOURCE } from '@/lib/security-headers';

/*
  The Security piece: this site's own security code (the content policy next.config.ts sends)
  as lacquered 3D pieces, one per character (lib/cipher/renderer.ts). When it comes into view
  it is encrypted for real in the visitor's browser (AES-256-GCM, WebCrypto, a fresh key that
  never leaves the page): the pieces lift, turn and close into one sealed block.
  One button plays it again; dragging turns the block.

  Until the 3D is ready, and without WebGL2, the same text is shown flat. Without JavaScript
  the code is shown and the button is hidden. With reduced motion every change is immediate.
*/
type Phase = 'plain' | 'sealing' | 'sealed' | 'opening';

const toBase64 = (bytes: Uint8Array) => { let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };

function glyphLines(): Glyph[][] {
  return highlight(CSP_SOURCE, 'ts').map(tokens => tokens.flatMap(token => [...token.text].map(ch => ({ ch, tone: token.kind }))));
}
/** Wraps long lines the way an editor would: at a space when there is one, continuing indented. */
function wrap(lines: Glyph[][], width: number): Glyph[][] {
  const out: Glyph[][] = [];
  const indent: Glyph[] = Array.from({ length: 4 }, () => ({ ch: ' ', tone: 'plain' }));
  for (const line of lines) {
    let rest = line, first = true;
    while (rest.length > width) {
      let cut = -1;
      for (let i = width; i > width * 0.45; i--) if (rest[i]?.ch === ' ') { cut = i; break; }
      if (cut < 0) cut = width;
      out.push(rest.slice(0, cut));
      rest = [...(first ? indent : []), ...rest.slice(rest[cut]?.ch === ' ' ? cut + 1 : cut)];
      first = false;
    }
    out.push(rest);
  }
  return out;
}

async function encryptPolicy() {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return toBase64(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(CSP_SOURCE))));
}

export function Vault({ copy }: { copy: VaultCopy }) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<VaultRenderer | null>(null);
  const press = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const lines = useMemo(glyphLines, []);
  const tokens = useMemo(() => highlight(CSP_SOURCE, 'ts'), []);
  const [phase, setPhase] = useState<Phase>('plain');
  const [cipher, setCipher] = useState('');
  const [gl, setGl] = useState<'off' | 'on'>('off');
  const [able, setAble] = useState(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const seal = useCallback(async () => {
    if (phaseRef.current !== 'plain') return;
    setPhase('sealing');
    try {
      const text = await encryptPolicy();
      setCipher(text);
      await scene.current?.encrypt(text);
      setPhase('sealed');
    } catch { setPhase('plain'); }
  }, []);

  const replay = useCallback(async () => {
    if (phaseRef.current !== 'sealed') return;
    setPhase('opening');
    await scene.current?.decrypt();
    setPhase('plain');
    phaseRef.current = 'plain';
    await seal();
  }, [seal]);

  useEffect(() => {
    const el = stage.current, cv = canvas.current;
    if (!el || !cv) return;
    setAble(Boolean(window.crypto?.subtle) && window.isSecureContext);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    let disposed = false, seen = false, ready = false;
    // It seals itself once the piece is well in view (with the 3D, or flat without it).
    const inView = () => { const r = el.getBoundingClientRect(); return Math.min(r.bottom, innerHeight) - Math.max(r.top, 0) >= r.height * 0.45; };
    const maybeSeal = () => { if (ready && (seen || inView())) { seen = true; window.setTimeout(seal, reduced ? 0 : 500); } };

    const load = async () => {
      if (connection?.saveData || (navigator.hardwareConcurrency || 4) <= 2) { ready = true; maybeSeal(); return; }
      try {
        const module = await import('@/lib/cipher/renderer');
        const probe = document.createElement('canvas').getContext('webgl2');
        probe?.getExtension('WEBGL_lose_context')?.loseContext();
        if (!probe || disposed) { ready = true; maybeSeal(); return; }
        const family = getComputedStyle(el).getPropertyValue('--font-mono').trim() || 'monospace';
        const tall = cv.clientHeight > cv.clientWidth * 0.9;
        const created = await module.createVaultRenderer(cv, {
          lines: tall ? wrap(lines, 22) : lines, family, compact: el.clientWidth < 700, reduced,
          onLost: () => { scene.current?.dispose(); scene.current = null; setGl('off'); },
        });
        if (disposed) { created.dispose(); return; }
        scene.current = created;
        created.resize(cv.clientWidth, cv.clientHeight);
        setGl('on');
      } catch { /* the flat version stays */ }
      ready = true;
      maybeSeal();
    };
    const near = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { near.disconnect(); load(); } }, { rootMargin: '700px 0px' });
    near.observe(el);
    const view = new IntersectionObserver(([entry]) => {
      scene.current?.setVisible(entry.isIntersecting);
      if (entry.intersectionRatio >= 0.45 && !seen) { seen = true; maybeSeal(); }
    }, { threshold: [0, 0.45] });
    view.observe(el);
    const sized = new ResizeObserver(() => scene.current?.resize(cv.clientWidth, cv.clientHeight));
    sized.observe(cv);
    return () => { disposed = true; near.disconnect(); view.disconnect(); sized.disconnect(); scene.current?.dispose(); scene.current = null; };
  }, [lines, seal]);

  // Drag turns the block; the mouse leans it.
  const onDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button > 0) return;
    press.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  };
  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const s = scene.current;
    if (!s) return;
    const held = press.current;
    if (held && held.id === event.pointerId) {
      const dx = event.clientX - held.x, dy = event.clientY - held.y;
      if (!held.moved && Math.hypot(dx, dy) > 6) { held.moved = true; event.currentTarget.setPointerCapture(event.pointerId); }
      if (held.moved) { s.turn(Math.max(-0.5, Math.min(0.5, dy * 0.004)), Math.max(-0.9, Math.min(0.9, dx * 0.006)), true); return; }
    }
    if (event.pointerType === 'mouse') {
      const box = event.currentTarget.getBoundingClientRect();
      s.lean(((event.clientX - box.left) / box.width) * 2 - 1, ((event.clientY - box.top) / box.height) * 2 - 1);
    }
  };
  const onUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (press.current?.id !== event.pointerId) return;
    if (press.current.moved) scene.current?.turn(0, 0, false);
    press.current = null;
  };

  const sealed = phase === 'sealed' || phase === 'sealing';
  const flat = sealed && cipher ? cipher.match(new RegExp(`.{1,${Math.ceil(cipher.length / lines.length)}}`, 'g')) ?? [] : null;

  return <div className="vault" data-phase={phase} data-gl={gl}>
    <div ref={stage} className="vault-stage" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      onPointerLeave={() => scene.current?.lean(0, 0)}>
      <canvas ref={canvas} className="vault-canvas" role="img" aria-label={copy.area} />
      <pre className="vault-flat" aria-hidden="true"><code>
        {flat
          ? flat.map((row, i) => <span key={i} className="vault-flat-line vault-flat-cipher">{row}</span>)
          : tokens.map((line, i) => <span key={i} className="vault-flat-line">{line.map((t, j) => <span key={j} className={`tk-${t.kind}`}>{t.text}</span>)}</span>)}
      </code></pre>
      <p className="vault-tag" aria-live="polite"><span className="point" aria-hidden="true" />{phase === 'sealed' ? copy.sealed : copy.code}</p>
    </div>
    <button type="button" className="button vault-action" onClick={phase === 'plain' ? seal : replay} disabled={!able || phase === 'sealing' || phase === 'opening'}>
      <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><rect x="4" y="9" width="12" height="8" rx="2" /><path d="M7 9V6.5a3 3 0 0 1 6 0V9" /></svg>
      {phase === 'plain' ? copy.protect : copy.again}
    </button>
  </div>;
}
