'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import type { SecurityBenchCopy } from '@/i18n/types';
import { highlight, type Token } from '@/lib/highlight';
import { CSP_SOURCE } from '@/lib/security-headers';

/*
  The Security bench: this site's own content policy (the code next.config.ts sends), encrypted
  for real in the visitor's browser with AES-256-GCM (WebCrypto). A fresh key and IV are made
  on every run and never leave the page.

  The plate is CSS 3D with real text, like the Projects stack. Encrypting sweeps down the plate:
  each line lifts off, scrambles and settles back as ciphertext. Beside it, a small plate is a
  scaled copy of the code's shape (a homothety: same shape, other size) under the outline of
  the original. Plaintext fits that outline; ciphertext breaks it: every line the same length,
  no trace of the code's shape. Decrypting plays it back. Changing one byte makes decryption fail, because
  GCM authenticates the ciphertext.

  Drag turns the plate. With reduced motion every change is immediate. Without JavaScript the
  plaintext plate is shown and the controls are hidden.
*/
type Phase = 'plain' | 'encrypting' | 'cipher' | 'tampered' | 'decrypting' | 'rejected' | 'restored';
type Bytes = Uint8Array<ArrayBuffer>;
type Sealed = { ciphertext: Bytes; base64: string; iv: string; fingerprint: string; key: CryptoKey; ivBytes: Bytes };

const STAGGER = 0.045;       // delay between lines, as a share of the sweep
const ENCRYPT_MS = 1700;
const DECRYPT_MS = 1400;
const NOISE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const REST = { x: 14, y: -18 }; // resting pose, degrees

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const hex = (bytes: Uint8Array) => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
const base64 = (bytes: Uint8Array) => { let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };
const rows = (text: string, width: number) => text.match(new RegExp(`.{1,${width}}`, 'g')) ?? [];
// Deterministic per-line jitter, so every run breaks the plate the same, readable way.
const lift = (i: number) => 12 + ((i * 37) % 17);
const drift = (i: number) => (((i * 53) % 13) - 6);

function tokensFrom(tokens: Token[], from: number, to: number) {
  const out: Token[] = [];
  let at = 0;
  for (const token of tokens) {
    const end = at + token.text.length;
    if (end > from && at < to) out.push({ ...token, text: token.text.slice(Math.max(0, from - at), Math.min(token.text.length, to - at)) });
    at = end;
  }
  return out;
}

type Piece = { kind: string; text: string };
/** One line at progress q: ciphertext up to the sweep, a few scrambled glyphs, then the code. */
function morph(plain: Token[], plainText: string, cipher: string, q: number, marked: Set<number>, offset: number): Piece[] {
  if (q <= 0) return plain.map(t => ({ kind: `tk-${t.kind}`, text: t.text }));
  if (q >= 1) return pieces(cipher, marked, offset);
  const e = ease(q);
  const length = Math.round(plainText.length + (cipher.length - plainText.length) * e);
  const cut = Math.floor(e * length);
  const scramble = Math.min(length - cut, 3 + Math.floor(Math.sin(q * Math.PI) * 4));
  const out: Piece[] = pieces(cipher.slice(0, cut), marked, offset);
  let noise = '';
  for (let i = 0; i < scramble; i++) noise += NOISE[Math.floor(Math.random() * NOISE.length)];
  if (noise) out.push({ kind: 'cb-noise', text: noise });
  const rest = cut + scramble;
  if (rest < length) {
    out.push(...tokensFrom(plain, rest, Math.min(length, plainText.length)).map(t => ({ kind: `tk-${t.kind}`, text: t.text })));
    if (length > plainText.length) {
      let pad = '';
      for (let i = Math.max(rest, plainText.length); i < length; i++) pad += NOISE[Math.floor(Math.random() * NOISE.length)];
      out.push({ kind: 'cb-noise', text: pad });
    }
  }
  return out;
}

/** Ciphertext, with the characters changed by tampering marked. */
function pieces(text: string, marked: Set<number>, offset: number): Piece[] {
  if (!marked.size) return [{ kind: 'cb-cipher', text }];
  const out: Piece[] = [];
  for (let i = 0; i < text.length; i++) {
    const kind = marked.has(offset + i) ? 'cb-changed' : 'cb-cipher';
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text[i]; else out.push({ kind, text: text[i] });
  }
  return out;
}

export function CipherBench({ copy }: { copy: SecurityBenchCopy }) {
  const plainLines = useMemo(() => CSP_SOURCE.split('\n'), []);
  const plainTokens = useMemo(() => highlight(CSP_SOURCE, 'ts'), []);
  const plainBytes = useMemo(() => new TextEncoder().encode(CSP_SOURCE).length, []);

  const [phase, setPhase] = useState<Phase>('plain');
  const [t, setT] = useState(0);                    // 0 plaintext → 1 ciphertext
  const [sealed, setSealed] = useState<Sealed | null>(null);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [available, setAvailable] = useState(true);
  const [pose, setPose] = useState(REST);
  const [dragging, setDragging] = useState(false);
  const reduced = useRef(false);
  const frame = useRef(0);
  const drag = useRef<{ id: number; x: number; y: number; from: { x: number; y: number } } | null>(null);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setAvailable(Boolean(window.crypto?.subtle) && window.isSecureContext);
    return () => cancelAnimationFrame(frame.current);
  }, []);

  // The ciphertext is laid out over as many lines as the code, every line the same length.
  const width = sealed ? Math.ceil(sealed.base64.length / plainLines.length) : 38;
  const cipherRows = useMemo(() => rows(sealed?.base64 ?? '', width), [sealed, width]);
  const count = Math.max(plainLines.length, cipherRows.length);
  const span = 1 + (count - 1) * STAGGER;

  /** Sweeps t from `from` to `to`; resolves when the plate has settled. */
  const sweep = useCallback((from: number, to: number, ms: number) => new Promise<void>(resolve => {
    if (reduced.current) { setT(to); resolve(); return; }
    const start = performance.now();
    const step = (now: number) => {
      const k = clamp((now - start) / ms);
      setT(from + (to - from) * k);
      if (k < 1) frame.current = requestAnimationFrame(step); else resolve();
    };
    frame.current = requestAnimationFrame(step);
  }), []);

  const encrypt = useCallback(async () => {
    const subtle = window.crypto.subtle;
    const key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const ivBytes = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: ivBytes }, key, new TextEncoder().encode(CSP_SOURCE)));
    const digest = new Uint8Array(await subtle.digest('SHA-256', await subtle.exportKey('raw', key)));
    setSealed({ ciphertext, base64: base64(ciphertext), iv: hex(ivBytes), fingerprint: hex(digest.slice(0, 6)), key, ivBytes });
    setMarked(new Set());
    setPhase('encrypting');
    await sweep(0, 1, ENCRYPT_MS);
    setPhase('cipher');
  }, [sweep]);

  const decrypt = useCallback(async () => {
    if (!sealed) return;
    setPhase('decrypting');
    try {
      const plain = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: sealed.ivBytes }, sealed.key, sealed.ciphertext);
      if (new TextDecoder().decode(plain) !== CSP_SOURCE) throw new Error('mismatch');
      await sweep(1, 0, DECRYPT_MS);
      setPhase('restored');
    } catch {
      setPhase('rejected');
    }
  }, [sealed, sweep]);

  const tamper = useCallback(() => {
    if (!sealed) return;
    const ciphertext = sealed.ciphertext.slice();
    const index = Math.floor(ciphertext.length * (0.25 + Math.random() * 0.5));
    ciphertext[index] ^= 1 << Math.floor(Math.random() * 8);
    const next = base64(ciphertext);
    const changed = new Set<number>();
    for (let i = 0; i < next.length; i++) if (next[i] !== sealed.base64[i]) changed.add(i);
    setSealed({ ...sealed, ciphertext, base64: next });
    setMarked(changed);
    setPhase('tampered');
  }, [sealed]);

  const reset = useCallback(async () => {
    setMarked(new Set());
    await sweep(1, 0, DECRYPT_MS);
    setSealed(null);
    setPhase('plain');
  }, [sweep]);

  const busy = phase === 'encrypting' || phase === 'decrypting';
  const primary = phase === 'plain' || phase === 'restored' ? { label: copy.encrypt, run: encrypt }
    : phase === 'rejected' ? { label: copy.reset, run: reset }
    : { label: copy.decrypt, run: decrypt };

  // Drag turns the plate; letting go eases it back to rest.
  const onDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button > 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, from: pose };
    setDragging(true);
  };
  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    setPose({ x: clamp(d.from.x - (event.clientY - d.y) * 0.25, -10, 40), y: clamp(d.from.y + (event.clientX - d.x) * 0.3, -50, 40) });
  };
  const onUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    setPose(REST);
  };

  // Lines at the current sweep, and the silhouette under them.
  const lines = Array.from({ length: count }, (_, i) => {
    const q = clamp(t * span - i * STAGGER);
    const plainText = plainLines[i] ?? '';
    const cipher = cipherRows[i] ?? '';
    const content = sealed ? morph(plainTokens[i] ?? [], plainText, cipher, q, marked, i * width) : (plainTokens[i] ?? []).map(k => ({ kind: `tk-${k.kind}`, text: k.text }));
    const length = q <= 0 ? plainText.length : q >= 1 ? cipher.length : Math.round(plainText.length + (cipher.length - plainText.length) * ease(q));
    const broken = reduced.current ? 0 : Math.sin(Math.PI * q);
    return { i, content, length, broken, empty: !plainText && !cipher && q <= 0 };
  });
  const widest = Math.max(width, ...plainLines.map(l => l.length));
  const shapePoints = plainLines.map((line, i) => `${(line.length / widest) * 100},${i} ${(line.length / widest) * 100},${i + 1}`).join(' ');

  const state = phase === 'restored' ? 'plain' : phase;
  const status = !available ? copy.status.unavailable : copy.status[phase === 'encrypting' ? 'working' : phase];
  const encrypted = t > 0.5;

  return <div className="cipher" data-phase={state} data-encrypted={encrypted || undefined}>
    <div className={`cipher-stage${dragging ? ' is-dragging' : ''}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      style={{ '--rx': `${pose.x}deg`, '--ry': `${pose.y}deg` } as CSSProperties} role="img" aria-label={copy.area}>
      <div className="cipher-plate" aria-hidden="true">
        <div className="cipher-sheet">
          <header className="cipher-head">
            <span className="cipher-file">{encrypted ? copy.fileEncrypted : copy.file}</span>
            <span className="cipher-tag">{encrypted ? copy.cipher : copy.plain}</span>
          </header>
          <pre className="cipher-code"><code>
            {lines.map(line => <span className="cipher-line" key={line.i} data-empty={line.empty || undefined}
              style={{ '--lift': `${(line.broken * lift(line.i)).toFixed(1)}px`, '--drift': `${(line.broken * drift(line.i)).toFixed(1)}px`, '--tilt': `${(line.broken * drift(line.i) * 0.6).toFixed(1)}deg` } as CSSProperties}>
              <span className="cipher-num">{line.i + 1}</span>
              <span className="cipher-text">{line.content.map((piece, k) => <span key={k} className={piece.kind}>{piece.text}</span>)}</span>
            </span>)}
          </code></pre>
        </div>
        {/* Beside the code, scaled down: its shape now, over the outline of the original. A homothety
            of the plaintext fits that outline exactly; the ciphertext does not. */}
        <div className="cipher-shape">
          <span className="cipher-shape-label">{copy.readout.shape}</span>
          <div className="cipher-shape-bars" style={{ '--rows': count } as CSSProperties}>
            {lines.map(line => <i key={line.i} style={{ '--w': line.length / widest } as CSSProperties} />)}
            <svg className="cipher-homothety" viewBox={`0 0 100 ${count}`} preserveAspectRatio="none">
              <polyline points={`0,0 ${shapePoints} 0,${plainLines.length}`} vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
        </div>
      </div>
      <span className="cipher-drag" aria-hidden="true">{copy.drag}</span>
    </div>

    <div className="cipher-panel">
      <p className="label"><span className="point" aria-hidden="true" />{copy.label}</p>
      <p className="cipher-lead">{copy.lead}</p>
      <div className="cipher-controls">
        <button type="button" className="button button-primary button-small" onClick={primary.run} disabled={!available || busy}>{primary.label}</button>
        <button type="button" className="button button-secondary button-small" onClick={tamper} disabled={!available || phase !== 'cipher'}>{copy.tamper}</button>
      </div>
      <p className="cipher-status" aria-live="polite" data-tone={phase === 'rejected' ? 'alert' : phase === 'tampered' ? 'warn' : undefined}>{status}</p>
      <dl className="cipher-readout">
        <div><dt>{copy.readout.algorithm}</dt><dd>AES-256-GCM</dd></div>
        <div><dt>{copy.readout.key}</dt><dd>{sealed ? <><code>{sealed.fingerprint}…</code> {copy.readout.keyValue}</> : '—'}</dd></div>
        <div><dt>{copy.readout.iv}</dt><dd>{sealed ? <code>{sealed.iv}</code> : '—'}</dd></div>
        <div><dt>{copy.readout.tag}</dt><dd>{copy.readout.tagValue}</dd></div>
        <div><dt>{copy.readout.size}</dt><dd>{copy.readout.bytes.replace('{n}', String(plainBytes))}{sealed && <> → {copy.readout.bytes.replace('{n}', String(sealed.ciphertext.length))}</>}</dd></div>
        <div><dt>{copy.readout.shape}</dt><dd data-lost={encrypted || undefined}>{encrypted ? copy.shape.lost : copy.shape.kept}</dd></div>
      </dl>
      <p className="cipher-note">{copy.shape.note}</p>
    </div>
  </div>;
}
