'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { VaultCopy } from '@/i18n/types';
import type { Glyph, VaultRenderer } from '@/lib/cipher/renderer';
import { highlight } from '@/lib/highlight';
import { CSP_SOURCE } from '@/lib/security-headers';

/*
  The Security vault. This site's content policy (the exact text next.config.ts sends) is
  encrypted for real in the visitor's browser with AES-256-GCM (WebCrypto): a fresh key and IV
  on every run, never sent anywhere. The 3D scene (lib/cipher/renderer.ts) shows it happen:
  one lacquered piece per character, lifting, turning and regrouping into the ciphertext.

    drag            turns the block; it eases back when let go
    click a piece   (encrypted) tampers with that character of the ciphertext
    decrypt         restores the code, or is refused if anything was changed

  The 3D engine loads as the section approaches. Until then, and without WebGL2, the same
  text is shown flat (and is what the page has without JavaScript); the buttons work either
  way. With reduced motion every change is immediate.
*/
type Phase = 'plain' | 'encrypting' | 'cipher' | 'tampered' | 'decrypting' | 'rejected' | 'restored';
type Bytes = Uint8Array<ArrayBuffer>;
type Sealed = { key: CryptoKey; iv: Bytes; base64: string; fingerprint: string; ivHex: string; length: number };

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const hex = (bytes: Uint8Array) => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
const toBase64 = (bytes: Uint8Array) => { let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };
const fromBase64 = (text: string): Bytes => Uint8Array.from(atob(text), c => c.charCodeAt(0)) as Bytes;
const PLAIN_BYTES = new TextEncoder().encode(CSP_SOURCE).length;

function glyphLines(): Glyph[][] {
  return highlight(CSP_SOURCE, 'ts').map(tokens => tokens.flatMap(token => [...token.text].map(ch => ({ ch, tone: token.kind }))));
}
/** Wraps long lines the way an editor would: at a space when there is one, continuing indented. */
function wrap(lines: Glyph[][], width: number): Glyph[][] {
  const out: Glyph[][] = [];
  for (const line of lines) {
    let rest = line;
    let first = true;
    while (rest.length > width) {
      let cut = -1;
      for (let i = width; i > width * 0.45; i--) if (rest[i]?.ch === ' ') { cut = i; break; }
      if (cut < 0) cut = width;
      out.push(rest.slice(0, cut));
      const indent: Glyph[] = first ? [{ ch: ' ', tone: 'plain' }, { ch: ' ', tone: 'plain' }, { ch: ' ', tone: 'plain' }, { ch: ' ', tone: 'plain' }] : [];
      first = false;
      rest = [...indent, ...rest.slice(rest[cut]?.ch === ' ' ? cut + 1 : cut)];
    }
    out.push(rest);
  }
  return out;
}

export function Vault({ copy }: { copy: VaultCopy }) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<VaultRenderer | null>(null);
  const press = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const lines = useMemo(glyphLines, []);
  const [phase, setPhase] = useState<Phase>('plain');
  const [sealed, setSealed] = useState<Sealed | null>(null);
  const [gl, setGl] = useState<'off' | 'loading' | 'on'>('off');
  const [crypto, setCrypto] = useState(true);
  const [pointing, setPointing] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setCrypto(Boolean(window.crypto?.subtle) && window.isSecureContext);
    const el = stage.current, cv = canvas.current;
    if (!el || !cv) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData || (navigator.hardwareConcurrency || 4) <= 2) return;
    let disposed = false;
    const load = async () => {
      setGl('loading');
      try {
        const module = await import('@/lib/cipher/renderer');
        const probe = document.createElement('canvas').getContext('webgl2');
        probe?.getExtension('WEBGL_lose_context')?.loseContext();
        if (!probe || disposed) { setGl('off'); return; }
        const family = getComputedStyle(el).getPropertyValue('--font-mono').trim() || 'monospace';
        // On a tall stage the code wraps at 20 columns, as an editor would.
        const tall = cv.clientHeight > cv.clientWidth * 0.9;
        const created = await module.createVaultRenderer(cv, {
          lines: tall ? wrap(lines, 22) : lines, family, compact: el.clientWidth < 700, reduced: reduced.current,
          onLost: () => { scene.current?.dispose(); scene.current = null; setGl('off'); },
        });
        if (disposed) { created.dispose(); return; }
        scene.current = created;
        created.resize(cv.clientWidth, cv.clientHeight);
        setGl('on');
      } catch { if (!disposed) setGl('off'); }
    };
    // Loaded as the section approaches; drawn only while it is on screen.
    const near = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { near.disconnect(); load(); } }, { rootMargin: '600px 0px' });
    near.observe(el);
    const onScreen = new IntersectionObserver(([entry]) => scene.current?.setVisible(entry.isIntersecting));
    onScreen.observe(el);
    const sized = new ResizeObserver(() => scene.current?.resize(cv.clientWidth, cv.clientHeight));
    sized.observe(cv);
    return () => { disposed = true; near.disconnect(); onScreen.disconnect(); sized.disconnect(); scene.current?.dispose(); scene.current = null; };
  }, [lines]);

  const encrypt = useCallback(async () => {
    const subtle = window.crypto.subtle;
    const key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const iv = window.crypto.getRandomValues(new Uint8Array(12)) as Bytes;
    const ciphertext = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(CSP_SOURCE)));
    const digest = new Uint8Array(await subtle.digest('SHA-256', await subtle.exportKey('raw', key)));
    const next: Sealed = { key, iv, base64: toBase64(ciphertext), fingerprint: hex(digest.slice(0, 4)), ivHex: hex(iv), length: ciphertext.length };
    setSealed(next);
    setPhase('encrypting');
    await scene.current?.encrypt(next.base64);
    setPhase('cipher');
  }, []);

  const decrypt = useCallback(async () => {
    if (!sealed) return;
    setPhase('decrypting');
    try {
      const plain = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: sealed.iv }, sealed.key, fromBase64(sealed.base64));
      if (new TextDecoder().decode(plain) !== CSP_SOURCE) throw new Error('mismatch');
      await scene.current?.decrypt();
      setPhase('restored');
    } catch {
      await scene.current?.refuse();
      setPhase('rejected');
    }
  }, [sealed]);

  const restart = useCallback(async () => {
    setPhase('decrypting');
    await scene.current?.decrypt();
    setSealed(null);
    setPhase('plain');
  }, []);

  /** Changes one character of the ciphertext: a real change to the bytes GCM will check. */
  const tamper = useCallback((slot: number) => {
    if (!sealed || (phase !== 'cipher' && phase !== 'tampered')) return;
    const at = Math.min(slot, sealed.base64.replace(/=+$/, '').length - 2);
    const current = B64.indexOf(sealed.base64[at]);
    if (current < 0) return;
    const ch = B64[current ^ 0b100000];
    const base64 = sealed.base64.slice(0, at) + ch + sealed.base64.slice(at + 1);
    setSealed({ ...sealed, base64 });
    scene.current?.mark(at, ch);
    setPhase('tampered');
  }, [sealed, phase]);

  // Pointer on the stage: lean, drag to turn, click a piece to tamper.
  const local = (event: ReactPointerEvent) => {
    const box = canvas.current!.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top, w: box.width, h: box.height };
  };
  const onDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button > 0 || (event.target as HTMLElement).closest('button')) return;
    press.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  };
  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const s = scene.current;
    if (!s) return;
    const p = local(event);
    const held = press.current;
    if (held && held.id === event.pointerId) {
      const dx = event.clientX - held.x, dy = event.clientY - held.y;
      if (!held.moved && Math.hypot(dx, dy) > 6) { held.moved = true; (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); }
      if (held.moved) { s.turn(Math.max(-0.5, Math.min(0.5, dy * 0.004)), Math.max(-0.9, Math.min(0.9, dx * 0.006)), true); return; }
    }
    if (event.pointerType === 'mouse') {
      s.lean((p.x / p.w) * 2 - 1, (p.y / p.h) * 2 - 1);
      const slot = phase === 'cipher' || phase === 'tampered' ? s.pick(p.x, p.y) : null;
      s.hover(slot);
      setPointing(slot !== null);
    }
  };
  const onUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const held = press.current;
    if (!held || held.id !== event.pointerId) return;
    press.current = null;
    if (held.moved) { scene.current?.turn(0, 0, false); return; }
    const p = local(event);
    const slot = scene.current?.pick(p.x, p.y);
    if (slot !== null && slot !== undefined) tamper(slot);
  };
  const onLeave = () => { scene.current?.lean(0, 0); scene.current?.hover(null); setPointing(false); };

  const busy = phase === 'encrypting' || phase === 'decrypting';
  const encrypted = phase === 'cipher' || phase === 'tampered' || phase === 'rejected' || (phase === 'decrypting' && Boolean(sealed));
  const action = phase === 'plain' || phase === 'restored' ? { label: copy.encrypt, run: encrypt }
    : phase === 'rejected' ? { label: copy.again, run: restart }
    : { label: copy.decrypt, run: decrypt };
  const status = crypto ? copy.status[phase] : copy.status.unavailable;

  // Flat version: the same text, as the page shows it before (or without) the 3D.
  const flatCipher = sealed ? (sealed.base64.match(new RegExp(`.{1,${Math.ceil(sealed.base64.length / lines.length)}}`, 'g')) ?? []) : [];

  return <div className="vault" data-phase={phase} data-gl={gl} data-encrypted={encrypted || undefined}>
    <div ref={stage} className="vault-stage" data-pointing={pointing || undefined}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onLeave}>
      <canvas ref={canvas} className="vault-canvas" role="img" aria-label={copy.area} />
      <pre className="vault-flat" aria-hidden={gl === 'on' || undefined}><code>
        {encrypted && flatCipher.length
          ? flatCipher.map((row, i) => <span key={i} className="vault-flat-line vault-flat-cipher">{row}</span>)
          : lines.map((line, i) => <span key={i} className="vault-flat-line">{line.map((g, j) => <span key={j} className={`tk-${g.tone}`}>{g.ch}</span>)}</span>)}
      </code></pre>

      <div className="vault-top">
        <p className="vault-file"><span>{copy.file}</span><span className="vault-file-policy">{copy.policy}</span></p>
        <p className="vault-state"><span className="point" aria-hidden="true" /><span>{encrypted ? <>{copy.cipher}<span className="vault-state-alg"> · AES-256-GCM</span></> : copy.plain}</span></p>
      </div>
      <p className="vault-hint" aria-hidden="true">
        {encrypted && gl === 'on' && <span className="vault-shape"><i />{copy.shape}</span>}
        <span>{encrypted && gl === 'on' ? copy.hintTamper : copy.hintDrag}</span>
      </p>
    </div>

    <div className="vault-bar">
      <button type="button" className="button vault-action" onClick={action.run} disabled={!crypto || busy}>
        <span className="vault-action-icon" aria-hidden="true">{encrypted ? <LockOpen /> : <Lock />}</span>{action.label}
      </button>
      <p className="vault-status" aria-live="polite" data-tone={phase === 'rejected' ? 'alert' : phase === 'tampered' ? 'warn' : undefined}>{status}</p>
      <dl className="vault-readout">
        <div><dt>{copy.key}</dt><dd>{sealed ? `${sealed.fingerprint}…` : '—'}</dd></div>
        <div><dt>{copy.iv}</dt><dd>{sealed ? `${sealed.ivHex.slice(0, 8)}…` : '—'}</dd></div>
        <div><dt>AES-GCM</dt><dd>{copy.bytes.replace('{a}', String(PLAIN_BYTES)).replace('{b}', sealed ? String(sealed.length) : '—')}</dd></div>
      </dl>
    </div>
  </div>;
}

function Lock() {
  return <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="4" y="9" width="12" height="8" rx="2" /><path d="M7 9V6.5a3 3 0 0 1 6 0V9" /></svg>;
}
function LockOpen() {
  return <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="4" y="9" width="12" height="8" rx="2" /><path d="M7 9V6.5a3 3 0 0 1 5.6-1.5" /></svg>;
}
