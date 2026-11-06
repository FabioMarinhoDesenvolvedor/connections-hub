'use client';

import { useId, useState } from 'react';
import type { Dictionary } from '@/i18n';

/*
  The message builder. The visitor picks what they need, writes a line and (if they like) their
  name, and watches the message take shape. The buttons open it, ready, in their own WhatsApp
  or e-mail: this site sends nothing and keeps nothing, so the privacy promise holds.
*/
type Form = Dictionary['contact']['form'];

export function Composer({ t, whatsapp, email }: { t: Form; whatsapp: string; email: string }) {
  const id = useId();
  const [kind, setKind] = useState(0);
  const [text, setText] = useState('');
  const [name, setName] = useState('');

  const who = name.trim();
  const lines = [
    who ? t.helloNamed.replace('{name}', who) : t.hello,
    kind < t.topics.length ? t.want.replace('{topic}', t.topics[kind]) : t.unsure,
    text.trim(),
  ].filter(Boolean);
  const message = lines.join('\n');
  const wa = `${whatsapp}?text=${encodeURIComponent(message)}`;
  const mail = `mailto:${email}?subject=${encodeURIComponent(`${t.subject} · ${t.kinds[kind]}`)}&body=${encodeURIComponent(message)}`;

  return <div className="composer">
    <fieldset className="composer-kinds">
      <legend>{t.need}</legend>
      <div>
        {t.kinds.map((label, i) => <label key={label} className="composer-chip">
          <input type="radio" name={`${id}-kind`} checked={kind === i} onChange={() => setKind(i)} />
          <span>{label}</span>
        </label>)}
      </div>
    </fieldset>
    <div className="composer-fields">
      <label className="composer-field composer-field-text">
        <span>{t.about}</span>
        <textarea rows={3} maxLength={400} value={text} placeholder={t.placeholder} onChange={event => setText(event.target.value)} />
      </label>
      <label className="composer-field">
        <span>{t.name} <small>({t.optional})</small></span>
        <input type="text" maxLength={60} autoComplete="name" value={name} onChange={event => setName(event.target.value)} />
      </label>
    </div>
    <div className="composer-preview" aria-live="polite">
      <span className="composer-preview-label">{t.preview}</span>
      <p className="composer-bubble">{lines.map((line, i) => <span key={i}>{line}</span>)}</p>
    </div>
    <div className="composer-actions">
      <a className="button composer-send" href={wa} target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4.5h12a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1z" /></svg>
        {t.whatsapp}
      </a>
      <a className="button composer-mail" href={mail}>
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 5h14v10H3zM3.5 5.5 10 11l6.5-5.5" /></svg>
        {t.email}
      </a>
    </div>
    <p className="composer-note">{t.note}</p>
  </div>;
}
