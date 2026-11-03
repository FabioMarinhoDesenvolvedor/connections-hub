'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react';

/*
  The post editor in the owner's panel. The text is Markdown, with buttons for what is easy
  to forget (bold, headings, links, lists, code, quotes, images) and the preview beside it,
  rendered by the same code as the published post.

  - Saves by itself a moment after each change; the status line says when.
  - Images: drop, paste or pick them; they are converted to WebP on the server and inserted
    where the cursor is.
  - "Pedir revisão" writes the post to GitHub as a pull request and Vercel builds a preview;
    "Publicar" merges it once that preview is ready. Both ask for a second click.
*/
type DraftProps = {
  id: string; title: string; slug: string; description: string; kind: string; tags: string; tldr: string; body: string;
  status: 'draft' | 'review' | 'published'; folder: string | null; prNumber: number | null; updatedAt: string;
};
type Image = { name: string; width: number; height: number };
type Review = { prUrl: string; state: 'open' | 'closed' | 'merged'; checks: 'pending' | 'success' | 'failure'; previewUrl: string | null } | null;
type Fields = Pick<DraftProps, 'title' | 'slug' | 'description' | 'kind' | 'tags' | 'tldr' | 'body'>;

const KIND_LABELS: Record<string, string> = { artigo: 'Artigo', opiniao: 'Opinião', analise: 'Análise', projeto: 'Projeto', anuncio: 'Anúncio' };
const SAVE_DELAY = 1200;
const PREVIEW_DELAY = 600;
const REVIEW_POLL = 15_000;

const slugify = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').filter(Boolean).slice(0, 8).join('-');

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error((data as { error?: string }).error ?? `Erro ${response.status}`), { data });
  return data as T;
}

export function Editor({ draft, images: initialImages, kinds, canReview }: { draft: DraftProps; images: Image[]; kinds: string[]; canReview: boolean }) {
  const [fields, setFields] = useState<Fields>({ title: draft.title, slug: draft.slug, description: draft.description, kind: draft.kind, tags: draft.tags, tldr: draft.tldr, body: draft.body });
  const [slugTouched, setSlugTouched] = useState(Boolean(draft.slug));
  const [status, setStatus] = useState(draft.status);
  const [saved, setSaved] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string; list?: string[] } | null>(null);
  const [preview, setPreview] = useState({ html: '', minutes: 1 });
  const [images, setImages] = useState<Image[]>(initialImages);
  const [review, setReview] = useState<Review>(null);
  const [busy, setBusy] = useState<'' | 'review' | 'publish' | 'upload' | 'delete'>('');
  const [confirm, setConfirm] = useState<'' | 'review' | 'publish' | 'delete'>('');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const text = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const first = useRef(true);
  const locked = status !== 'draft'; // the address is fixed once a review exists

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => setFields(f => {
    const next = { ...f, [key]: value };
    if (key === 'title' && !slugTouched && !locked) next.slug = slugify(String(value));
    return next;
  });

  // Save a moment after the last change.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSaved('saving');
    const timer = setTimeout(() => {
      call(`/api/admin/posts/${draft.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) })
        .then(() => setSaved('saved'), () => setSaved('error'));
    }, SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [fields, draft.id]);

  // The preview follows the text.
  useEffect(() => {
    const timer = setTimeout(() => {
      call<{ html: string; minutes: number }>(`/api/admin/posts/${draft.id}/preview`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: fields.body }) })
        .then(setPreview, () => undefined);
    }, PREVIEW_DELAY);
    return () => clearTimeout(timer);
  }, [fields.body, images, draft.id]);

  // While in review, keep an eye on the pull request and the preview.
  const loadReview = useCallback(() => {
    call<{ state: Review }>(`/api/admin/posts/${draft.id}/review`).then(r => setReview(r.state), () => undefined);
  }, [draft.id]);
  useEffect(() => {
    if (status !== 'review') return;
    loadReview();
    const timer = setInterval(loadReview, REVIEW_POLL);
    return () => clearInterval(timer);
  }, [status, loadReview]);

  // Formatting buttons: wrap the selection, or prefix the current lines.
  // The selection is applied right after React writes the new text, before the next keystroke.
  const pendingSelection = useRef<[number, number] | null>(null);
  useLayoutEffect(() => {
    const area = text.current;
    if (!area || !pendingSelection.current) return;
    area.focus();
    area.setSelectionRange(...pendingSelection.current);
    pendingSelection.current = null;
  }, [fields.body]);
  const edit = (change: (value: string, start: number, end: number) => { value: string; start: number; end: number }) => {
    const area = text.current;
    if (!area) return;
    const result = change(fields.body, area.selectionStart, area.selectionEnd);
    pendingSelection.current = [result.start, result.end];
    set('body', result.value);
  };
  const wrap = (before: string, after = before, placeholder = 'texto') => edit((v, s, e) => {
    const inner = v.slice(s, e) || placeholder;
    return { value: v.slice(0, s) + before + inner + after + v.slice(e), start: s + before.length, end: s + before.length + inner.length };
  });
  // Line marks toggle: a heading replaces another heading, the same mark again removes it.
  const LINE_MARK = /^(#{1,6} |> |- |\d+\. )/;
  const prefix = (mark: string) => edit((v, s, e) => {
    const lineStart = v.lastIndexOf('\n', s - 1) + 1;
    const lineEnd = v.indexOf('\n', e) === -1 ? v.length : v.indexOf('\n', e);
    const lines = v.slice(lineStart, lineEnd).split('\n');
    const same = lines.every(line => line.startsWith(mark === '1. ' ? '1. ' : mark) || (mark === '1. ' && /^\d+\. /.test(line)));
    const block = lines.map((line, i) => {
      const bare = line.replace(LINE_MARK, '');
      return same ? bare : (mark === '1. ' ? `${i + 1}. ` : mark) + bare;
    }).join('\n');
    const at = lineStart + block.length;
    return { value: v.slice(0, lineStart) + block + v.slice(lineEnd), start: at, end: at };
  });
  const insert = (snippet: string) => edit((v, s, e) => {
    const before = s > 0 && v[s - 1] !== '\n' ? '\n\n' : '';
    const value = v.slice(0, s) + before + snippet + '\n' + v.slice(e);
    const at = s + before.length + snippet.length + 1;
    return { value, start: at, end: at };
  });
  const link = () => {
    const url = window.prompt('Endereço do link (https://…)');
    if (url && /^https?:\/\//.test(url)) wrap('[', `](${url})`, 'texto do link');
  };

  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key === 'b') { event.preventDefault(); wrap('**'); }
    if (event.key === 'i') { event.preventDefault(); wrap('*'); }
    if (event.key === 'k') { event.preventDefault(); link(); }
  };

  const upload = async (files: FileList | File[]) => {
    const list = [...files].filter(f => f.type.startsWith('image/'));
    if (!list.length) return;
    setBusy('upload');
    setMessage(null);
    for (const f of list) {
      try {
        if (f.size > 4 * 1024 * 1024) throw new Error(`"${f.name}" passa de 4 MB; diminua a imagem antes.`);
        const image = await call<Image>(`/api/admin/posts/${draft.id}/images`, { method: 'POST', headers: { 'Content-Type': f.type, 'X-File-Name': encodeURIComponent(f.name) }, body: f });
        setImages(current => [...current.filter(i => i.name !== image.name), image]);
        insert(`![Descreva a imagem](${image.name})`);
      } catch (error) {
        setMessage({ tone: 'error', text: (error as Error).message });
      }
    }
    setBusy('');
  };
  const onDrop = (event: DragEvent<HTMLTextAreaElement>) => { if (event.dataTransfer.files.length) { event.preventDefault(); upload(event.dataTransfer.files); } };
  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => { if (event.clipboardData.files.length) { event.preventDefault(); upload(event.clipboardData.files); } };
  const removeImage = async (name: string) => {
    await call(`/api/admin/posts/${draft.id}/images/${name}`, { method: 'DELETE' }).catch(() => undefined);
    setImages(current => current.filter(i => i.name !== name));
  };

  const saveNow = () => call(`/api/admin/posts/${draft.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });

  const askReview = async () => {
    if (confirm !== 'review') { setConfirm('review'); return; }
    setConfirm(''); setBusy('review'); setMessage(null);
    try {
      await saveNow();
      await call(`/api/admin/posts/${draft.id}/review`, { method: 'POST' });
      setStatus('review');
      setMessage({ tone: 'ok', text: 'Enviado para revisão. A Vercel está gerando o preview (1 a 2 minutos). Peça a revisão ao Claude: "revise o PR do post".' });
      loadReview();
    } catch (error) {
      const data = (error as { data?: { problems?: string[] } }).data;
      setMessage({ tone: 'error', text: data?.problems ? 'Antes de pedir revisão, falta:' : (error as Error).message, list: data?.problems });
    }
    setBusy('');
  };

  const publish = async () => {
    if (confirm !== 'publish') { setConfirm('publish'); return; }
    setConfirm(''); setBusy('publish'); setMessage(null);
    try {
      const result = await call<{ url?: string }>(`/api/admin/posts/${draft.id}/publish`, { method: 'POST' });
      setStatus('published');
      setPublishedUrl(result.url ?? null);
      setMessage({ tone: 'ok', text: 'Publicado! O site é atualizado em cerca de um minuto.' });
    } catch (error) {
      setMessage({ tone: 'error', text: (error as Error).message });
    }
    setBusy('');
  };

  const discard = async () => {
    if (confirm !== 'delete') { setConfirm('delete'); return; }
    setBusy('delete');
    try {
      await call(`/api/admin/posts/${draft.id}`, { method: 'DELETE' });
      window.location.href = '/admin/posts';
    } catch (error) {
      setMessage({ tone: 'error', text: (error as Error).message });
      setBusy(''); setConfirm('');
    }
  };

  const savedText = { idle: '', saving: 'Salvando…', saved: 'Salvo', error: 'Não salvou: confira a conexão' }[saved];
  const checksText = review ? { pending: 'gerando o preview…', success: 'preview pronto', failure: 'o preview falhou' }[review.checks] : '';

  return <div className="editor">
    <div className="editor-top">
      <a className="post-back" href="/admin/posts">← Posts</a>
      <p className="editor-saved" aria-live="polite">{savedText}</p>
    </div>

    <div className="editor-meta">
      <label className="field editor-title">
        <span>Título</span>
        <input value={fields.title} maxLength={140} onChange={e => set('title', e.target.value)} placeholder="O título do post" />
      </label>
      <label className="field">
        <span>Resumo <small>uma ou duas frases: aparece na lista, no Google e no RSS</small></span>
        <textarea rows={2} value={fields.description} maxLength={300} onChange={e => set('description', e.target.value)} />
      </label>
      <div className="editor-row">
        <label className="field">
          <span>Tipo</span>
          <select value={fields.kind} onChange={e => set('kind', e.target.value)}>
            {kinds.map(k => <option key={k} value={k}>{KIND_LABELS[k] ?? k}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Temas <small>separados por vírgula</small></span>
          <input value={fields.tags} maxLength={200} onChange={e => set('tags', e.target.value)} placeholder="ia, carreira" />
        </label>
        <label className="field">
          <span>Endereço {locked && <small>fixo depois da revisão</small>}</span>
          <input value={fields.slug} maxLength={80} disabled={locked} onChange={e => { setSlugTouched(true); set('slug', slugify(e.target.value) || e.target.value.toLowerCase()); }} />
        </label>
      </div>
      <label className="field">
        <span>Resumo em destaque <small>opcional, aparece no topo do post</small></span>
        <textarea rows={2} value={fields.tldr} maxLength={600} onChange={e => set('tldr', e.target.value)} />
      </label>
    </div>

    <div className="editor-tabs" role="tablist">
      <button type="button" role="tab" aria-selected={tab === 'write'} onClick={() => setTab('write')}>Escrever</button>
      <button type="button" role="tab" aria-selected={tab === 'preview'} onClick={() => setTab('preview')}>Prévia</button>
    </div>

    <div className="editor-panes" data-tab={tab}>
      <div className="editor-write">
        {/* mousedown is cancelled so the text keeps the focus and the selection while a button is used */}
        <div className="editor-toolbar" role="toolbar" aria-label="Formatação" onMouseDown={e => { if ((e.target as HTMLElement).closest('button')) e.preventDefault(); }}>
          <button type="button" title="Negrito (Ctrl+B)" onClick={() => wrap('**')}><b>N</b></button>
          <button type="button" title="Itálico (Ctrl+I)" onClick={() => wrap('*')}><i>I</i></button>
          <button type="button" title="Seção" onClick={() => prefix('## ')}>Seção</button>
          <button type="button" title="Subseção" onClick={() => prefix('### ')}>Subseção</button>
          <button type="button" title="Link (Ctrl+K)" onClick={link}>Link</button>
          <button type="button" title="Lista" onClick={() => prefix('- ')}>• Lista</button>
          <button type="button" title="Lista numerada" onClick={() => prefix('1. ')}>1. Lista</button>
          <button type="button" title="Citação" onClick={() => prefix('> ')}>Citação</button>
          <button type="button" title="Código no meio da frase" onClick={() => wrap('`', '`', 'código')}>Código</button>
          <button type="button" title="Bloco de código" onClick={() => insert('```bash\ncomando\n```')}>Bloco</button>
          <button type="button" title="Imagem" onClick={() => file.current?.click()} disabled={busy === 'upload'}>{busy === 'upload' ? 'Enviando…' : 'Imagem'}</button>
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif" multiple hidden onChange={e => { if (e.target.files) upload(e.target.files); e.target.value = ''; }} />
        </div>
        <textarea
          ref={text}
          className="editor-text"
          value={fields.body}
          onChange={e => set('body', e.target.value)}
          onKeyDown={onKey}
          onDrop={onDrop}
          onPaste={onPaste}
          placeholder={'Escreva aqui.\n\nUse "Seção" para dividir o texto em partes: elas viram o índice do post.\nArraste imagens para cá.'}
          aria-label="Texto do post"
          spellCheck
        />
        {images.length > 0 && <ul className="editor-images">
          {images.map(i => <li key={i.name}>
            <span>{i.name} <small>{i.width}×{i.height}</small></span>
            <button type="button" onClick={() => insert(`![Descreva a imagem](${i.name})`)}>Inserir</button>
            <button type="button" onClick={() => removeImage(i.name)}>Remover</button>
          </li>)}
        </ul>}
      </div>
      <div className="editor-preview">
        <p className="label">Prévia · {preview.minutes} min de leitura</p>
        <h1 className="post-title">{fields.title || 'Sem título'}</h1>
        {fields.description && <p className="post-lead">{fields.description}</p>}
        {fields.tldr && <section className="post-tldr"><p className="label">Resumo</p><p>{fields.tldr}</p></section>}
        <div className="post-body" dangerouslySetInnerHTML={{ __html: preview.html }} />
      </div>
    </div>

    <div className="editor-actions">
      {message && <div className="comment-status" data-tone={message.tone} role={message.tone === 'error' ? 'alert' : 'status'} style={{ display: 'block' }}>
        {message.text}
        {message.list && <ul>{message.list.map(p => <li key={p}>{p}</li>)}</ul>}
        {publishedUrl && <> <a href={publishedUrl} target="_blank" rel="noopener">Ver o post ↗</a></>}
      </div>}

      {status === 'review' && review && <p className="editor-review">
        Em revisão: <a href={review.prUrl} target="_blank" rel="noopener">PR no GitHub ↗</a>
        {' · '}{checksText}
        {review.previewUrl && <>{' · '}<a href={review.previewUrl + (draft.folder ? `/blog/${draft.folder.replace(/^(\d{4})\/(\d{2})\/(\d{2})-/, '$1/$2/$3/')}` : '/blog')} target="_blank" rel="noopener">abrir o preview ↗</a></>}
      </p>}

      <div className="editor-buttons">
        {status !== 'published' && <button type="button" className="button button-secondary" onClick={askReview} disabled={!canReview || busy !== ''}>
          {busy === 'review' ? 'Enviando…' : confirm === 'review' ? 'Clique de novo para confirmar' : status === 'review' ? 'Atualizar a revisão' : 'Pedir revisão'}
        </button>}
        {status === 'review' && <button type="button" className="button button-primary" onClick={publish} disabled={busy !== '' || review?.checks !== 'success'}>
          {busy === 'publish' ? 'Publicando…' : confirm === 'publish' ? 'Clique de novo para publicar' : 'Publicar'}
        </button>}
        {status !== 'published' && <button type="button" className="button button-secondary button-small editor-discard" onClick={discard} disabled={busy !== ''}>
          {confirm === 'delete' ? 'Clique de novo para descartar' : 'Descartar rascunho'}
        </button>}
      </div>
      {!canReview && <p className="admin-lead">Para pedir revisão e publicar, falta o GITHUB_CONTENT_TOKEN na Vercel.</p>}
    </div>
  </div>;
}
