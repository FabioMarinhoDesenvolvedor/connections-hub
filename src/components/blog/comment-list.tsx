'use client';

import { useEffect, useState } from 'react';
import { localeInfo, type Locale } from '@/i18n/config';

type Item = { id: string; name: string; body: string; createdAt: string };
type Copy = { count: { one: string; other: string }; empty: string; loading: string; unavailable: string };
type State = { status: 'loading' } | { status: 'ready'; items: Item[] } | { status: 'unavailable' };

/*
  The approved comments of one post, read from /api/comments when the page opens, so a
  comment shows as soon as it is approved (or disappears as soon as it is deleted) without
  rebuilding the site. Names and text are rendered as text, never as HTML.
*/
export function CommentList({ postId, locale, t }: { postId: string; locale: Locale; t: Copy }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/comments?post=${encodeURIComponent(postId)}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { comments: Item[] }) => setState({ status: 'ready', items: data.comments }))
      .catch(error => { if (error.name !== 'AbortError') setState({ status: 'unavailable' }); });
    return () => controller.abort();
  }, [postId]);

  if (state.status === 'loading') return <p className="comments-state" aria-live="polite">{t.loading}</p>;
  if (state.status === 'unavailable') return <p className="comments-state">{t.unavailable}</p>;
  if (state.items.length === 0) return <p className="comments-state">{t.empty}</p>;
  const date = new Intl.DateTimeFormat(localeInfo[locale].html, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  const n = state.items.length;
  return <>
    <p className="comments-count">{(n === 1 ? t.count.one : t.count.other).replace('{n}', String(n))}</p>
    <ol className="comment-list">
      {state.items.map(item => <li key={item.id} className="comment">
        <p className="comment-meta"><b>{item.name}</b> <time dateTime={item.createdAt}>{date.format(new Date(item.createdAt))}</time></p>
        <p className="comment-body">{item.body}</p>
      </li>)}
    </ol>
  </>;
}
