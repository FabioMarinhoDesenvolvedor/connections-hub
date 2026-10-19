'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { codeFiles, type CodeId } from '@/data/code';
import { highlight, type Token } from '@/lib/highlight';

/*
  The About terminal, played by the visitor: real code from the projects, and whatever they
  type becomes that code.

    keyboard   click the terminal and type anything: every key writes the next few characters
               of the real file, with syntax colours; Backspace takes some back, Enter finishes
               the line. A finished file is announced and the next one opens.
    touch      no keyboard needed: hold the big button and the code pours out, faster the
               longer you hold, with a light tap of vibration at each new line.

  Beside it: what the file solves, its project and language, and how much the visitor has
  "written". Nothing types on its own except a short opening hint. With reduced motion (or
  without JavaScript) the code is simply shown, whole.
*/
export type CodeCopy = {
  label: string; title: string; intro: string; solves: string; project: string; language: string; tabs: string;
  files: Record<CodeId, string>;
  play: { keys: string; hold: string; holding: string; typed: string; chars: string; done: string; next: string; area: string };
};

const PRIMER = 0.22; // share of the first file already written, so the terminal is never empty

/** How far one keystroke reaches: to the end of the next token or two, at least a few characters. */
function reach(source: string, from: number) {
  let i = from;
  // indentation lands at once
  while (source[i] === ' ' && (i === 0 || /^ *$/.test(source.slice(source.lastIndexOf('\n', i - 1) + 1, i)))) i++;
  const goal = i + 3 + Math.floor(Math.random() * 4);
  while (i < source.length && i < goal) { i++; if (source[i - 1] === '\n') break; }
  // finish a word rather than cut it
  while (i < source.length && /\w/.test(source[i]) && /\w/.test(source[i - 1]) && i - from < 14) i++;
  return Math.min(source.length, i);
}

function slice(lines: Token[][], count: number) {
  const out: Token[][] = [];
  let left = count;
  for (const tokens of lines) {
    if (left < 0) break;
    const row: Token[] = [];
    for (const token of tokens) {
      if (left <= 0) break;
      row.push(left >= token.text.length ? token : { ...token, text: token.text.slice(0, left) });
      left -= token.text.length;
    }
    out.push(row);
    left -= 1;
  }
  return out;
}

export function CodeTerminal({ copy }: { copy: CodeCopy }) {
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [typed, setTyped] = useState(Number.POSITIVE_INFINITY);
  const [total, setTotal] = useState(0);       // characters written by the visitor, all files
  const [focused, setFocused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [finished, setFinished] = useState(false);
  const [live, setLive] = useState(false);     // interactive (JS, motion allowed)
  const [touch, setTouch] = useState(false);

  const file = codeFiles[active];
  const lines = useMemo(() => highlight(file.source, file.language), [file]);
  const shown = useMemo(() => slice(lines, typed), [lines, typed]);
  const length = file.source.length;
  const done = typed >= length;
  const progress = Math.min(1, typed / length);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTouch(window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches);
    if (reduced) return;
    setLive(true);
    setTyped(Math.floor(codeFiles[0].source.length * PRIMER));
  }, []);

  // keep the newest line in view
  useEffect(() => {
    const el = body.current;
    if (el && live) el.scrollTop = el.scrollHeight;
  }, [typed, live]);

  const open = useCallback((index: number) => {
    setActive(index);
    setFinished(false);
    setTyped(0);
  }, []);

  // the written position, readable synchronously by the handlers
  const at = useRef(typed);
  at.current = typed;
  const moveTo = useCallback((to: number) => {
    const source = codeFiles[active].source;
    const from = Number.isFinite(at.current) ? at.current : source.length;
    if (to > from) {
      setTotal(t => t + (to - from));
      if (touch && source.slice(from, to).includes('\n')) navigator.vibrate?.(6);
    }
    at.current = to;
    setTyped(to);
    if (to >= source.length) setFinished(true);
  }, [active, touch]);

  /** One keystroke's worth of code; `steps` > 1 for a held button's bursts. */
  const write = useCallback((steps = 1) => {
    const source = codeFiles[active].source;
    let to = Number.isFinite(at.current) ? at.current : source.length;
    if (to >= source.length) return;
    for (let i = 0; i < steps && to < source.length; i++) to = reach(source, to);
    moveTo(to);
  }, [active, moveTo]);

  const erase = useCallback(() => {
    const from = Number.isFinite(at.current) ? at.current : length;
    at.current = Math.max(0, from - 6);
    setTyped(at.current);
    setFinished(false);
  }, [length]);

  const endLine = useCallback(() => {
    const source = codeFiles[active].source;
    const from = Number.isFinite(at.current) ? at.current : source.length;
    const next = source.indexOf('\n', from);
    moveTo(next < 0 ? source.length : next + 1);
  }, [active, moveTo]);

  // a finished file: say so, then open the next one
  useEffect(() => {
    if (!finished || !live) return;
    const timer = window.setTimeout(() => open((active + 1) % codeFiles.length), 2200);
    return () => clearTimeout(timer);
  }, [finished, live, active, open]);

  // the held button pours code out, faster the longer it is held
  useEffect(() => {
    if (!holding) return;
    let frame = 0, last = 0, held = 0, budget = 0;
    const step = (now: number) => {
      const dt = last ? Math.min(64, now - last) : 16;
      last = now; held += dt; budget += dt;
      const every = Math.max(22, 90 - held / 25); // ms per burst, speeding up
      if (budget >= every) { budget = 0; write(1 + Math.floor(held / 1600)); }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [holding, write]);

  const onKey = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Tab' || event.key === 'Escape') { if (event.key === 'Escape') input.current?.blur(); return; }
    event.preventDefault();
    if (event.key === 'Backspace') erase();
    else if (event.key === 'Enter') endLine();
    else if (event.key.length === 1 || event.key === 'Unidentified' || event.key === 'Process') write();
  };
  // phone keyboards may not send usable key events: any input still writes
  const onInput = (event: React.FormEvent<HTMLTextAreaElement>) => { event.currentTarget.value = ''; write(); };

  const nextFile = codeFiles[(active + 1) % codeFiles.length];

  return <div className="code-term" ref={root} data-live={live || undefined} data-focused={focused || undefined}>
    <div className="ct-window">
      <div className="ct-bar">
        <span className="ct-dots" aria-hidden="true"><i /><i /><i /></span>
        <div className="ct-tabs" role="tablist" aria-label={copy.tabs}>
          {codeFiles.map((f, i) => <button key={f.id} type="button" role="tab" aria-selected={i === active} className="ct-tab" onClick={() => open(i)}>
            <span className="ct-tab-lang">{f.label.split(' ')[0]}</span>{f.path.split('/').pop()!.split(' ')[0]}
          </button>)}
        </div>
      </div>
      <div className="ct-body" ref={body} onClick={() => input.current?.focus()} role="tabpanel" aria-label={`${file.project} · ${file.path}`}>
        <p className="ct-prompt" aria-hidden="true"><span>~/{file.project.toLowerCase().replace(/\s+/g, '-')}</span> $ vim {file.path.split(' ')[0]}</p>
        <pre className="ct-code" lang="en"><code>{shown.map((tokens, i) => <span className="ct-line" key={i}>
          <span className="ct-num" aria-hidden="true">{i + 1}</span>
          <span className="ct-text">{tokens.map((t, j) => <span key={j} className={`tk-${t.kind}`}>{t.text}</span>)}{live && !done && i === shown.length - 1 && <span className={`ct-caret${focused || holding ? '' : ' is-idle'}`} aria-hidden="true" />}</span>
        </span>)}</code></pre>
        {live && done && <p className="ct-done" aria-live="polite"><span>✓</span> {copy.play.done} <b>{nextFile.path.split('/').pop()!.split(' ')[0]}</b></p>}
        <pre className="sr-only">{file.source}</pre>
        {/* The keyboard goes here: an invisible field, so phones raise their keyboard too. */}
        {live && <textarea ref={input} className="ct-input" aria-label={copy.play.area} autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false}
          onKeyDown={onKey} onInput={onInput} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />}
      </div>
      {live && <div className="ct-play">
        {!touch && <button type="button" className="ct-key" data-on={focused || undefined} onClick={() => input.current?.focus()}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M6 10h1M9.5 10h1M13 10h1M16.5 10h1M7.5 14h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          {copy.play.keys}
        </button>}
        <span className="ct-meter" aria-hidden="true"><i style={{ transform: `scaleX(${progress})` }} /></span>
        {touch
          ? <button type="button" className="ct-hold" data-holding={holding || undefined}
              onPointerDown={event => { event.preventDefault(); setHolding(true); }} onPointerUp={() => setHolding(false)} onPointerLeave={() => setHolding(false)} onPointerCancel={() => setHolding(false)} onContextMenu={event => event.preventDefault()}>
              <span className="ct-hold-dot" aria-hidden="true" />{holding ? copy.play.holding : copy.play.hold}
            </button>
          : <p className="ct-typed"><span>{copy.play.typed}</span> <b>{total.toLocaleString()}</b> {copy.play.chars}</p>}
      </div>}
    </div>
    <aside className="ct-aside" aria-live="polite">
      <p className="ct-count"><span>{String(active + 1).padStart(2, '0')}</span> / {String(codeFiles.length).padStart(2, '0')}</p>
      <dl className="ct-meta">
        <div><dt>{copy.project}</dt><dd>{file.project}</dd></div>
        <div><dt>{copy.language}</dt><dd>{file.label}</dd></div>
      </dl>
      <p className="ct-solves-label">{copy.solves}</p>
      <p className="ct-solves">{copy.files[file.id]}</p>
      {touch && live && <p className="ct-typed ct-typed-aside"><span>{copy.play.typed}</span> <b>{total.toLocaleString()}</b> {copy.play.chars}</p>}
    </aside>
  </div>;
}
