import { createHmac } from 'node:crypto';
import { db } from './db';
import { LIMITS } from './limits';
import { secret } from './session';

/*
  Comments and their moderation. A comment is stored as pending and is shown only after the
  owner approves it; rejecting deletes it, and an approved one can be deleted at any time
  (a real DELETE: nothing is kept). The visitor's IP is never stored, only a keyed hash used
  to limit how often one person can send, and it is erased when the comment is approved.
*/
export type Comment = { id: string; postId: string; locale: string; name: string; email: string | null; body: string; status: 'pending' | 'approved'; createdAt: Date };
export { LIMITS };
export type PublicComment = { id: string; name: string; body: string; createdAt: string };


export function hashIp(ip: string): string {
  return createHmac('sha256', secret()).update(`ip:${ip}`).digest('base64url');
}

const toComment = (r: Record<string, unknown>): Comment => ({
  id: String(r.id), postId: String(r.post_id), locale: String(r.locale), name: String(r.name),
  email: r.email ? String(r.email) : null, body: String(r.body), status: r.status === 'approved' ? 'approved' : 'pending',
  createdAt: new Date(r.created_at as string),
});

export async function approvedFor(postId: string): Promise<PublicComment[]> {
  const rows = await db(`SELECT id, name, body, created_at FROM comments WHERE post_id = $1 AND status = 'approved' ORDER BY created_at ASC LIMIT 500`, [postId]);
  return rows.map(r => ({ id: String(r.id), name: String(r.name), body: String(r.body), createdAt: new Date(r.created_at as string).toISOString() }));
}

export type SubmitResult = 'ok' | 'limit' | 'full';

export async function submit(input: { postId: string; locale: string; name: string; email: string | null; body: string; ipHash: string }): Promise<SubmitResult> {
  const [recent] = await db(`SELECT count(*)::int AS n FROM comments WHERE ip_hash = $1 AND created_at > now() - interval '10 minutes'`, [input.ipHash]);
  if (Number(recent.n) >= LIMITS.perIpPer10Min) return 'limit';
  const [pending] = await db(`SELECT count(*)::int AS n FROM comments WHERE status = 'pending'`);
  if (Number(pending.n) >= LIMITS.pendingMax) return 'full';
  await db(`INSERT INTO comments (post_id, locale, name, email, body, ip_hash) VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.postId, input.locale, input.name, input.email, input.body, input.ipHash]);
  return 'ok';
}

export async function listAll(): Promise<Comment[]> {
  const rows = await db(`SELECT id, post_id, locale, name, email, body, status, created_at FROM comments ORDER BY (status = 'pending') DESC, created_at DESC LIMIT 1000`);
  return rows.map(toComment);
}

export async function approve(id: string): Promise<void> {
  await db(`UPDATE comments SET status = 'approved', approved_at = now(), ip_hash = NULL WHERE id = $1`, [id]);
}

export async function remove(id: string): Promise<void> {
  await db(`DELETE FROM comments WHERE id = $1`, [id]);
}
