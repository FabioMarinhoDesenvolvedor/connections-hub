import { createHmac } from 'node:crypto';
import { db, DatabaseUnavailable } from './db';
import { LIMITS } from './limits';
import { secret } from './session';

/*
  Comments and their moderation. A comment is stored as pending and is shown only after the
  owner approves it; rejecting deletes it, and an approved one can be deleted at any time
  (a real DELETE: nothing is kept). The visitor's IP is never stored. A keyed hash of it goes
  in comment_attempts, apart from the comments, only to limit how often one person can send;
  each one is deleted after 10 minutes, and moderating a comment does not reset the count.
*/
export type Comment = { id: string; postId: string; locale: string; name: string; email: string | null; body: string; status: 'pending' | 'approved'; createdAt: Date };
export { LIMITS };
export type PublicComment = { id: string; name: string; body: string; createdAt: string };


export function hashIp(ip: string): string {
  let key: string;
  try { key = secret(); } catch { throw new DatabaseUnavailable('SESSION_SECRET is not set'); }
  return createHmac('sha256', key).update(`ip:${ip}`).digest('base64url');
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

/*
  One statement does it all, so parallel requests cannot slip past the checks one by one:
  forget attempts older than 10 minutes, count this person's recent attempts and the pending
  comments, record the attempt and store the comment only when both are under their limits.
*/
export async function submit(input: { postId: string; locale: string; name: string; email: string | null; body: string; ipHash: string }): Promise<SubmitResult> {
  const [row] = await db(`
    WITH purge AS (DELETE FROM comment_attempts WHERE at < now() - interval '10 minutes'),
    counts AS (
      SELECT (SELECT count(*) FROM comment_attempts WHERE ip_hash = $6 AND at > now() - interval '10 minutes')::int AS recent,
             (SELECT count(*) FROM comments WHERE status = 'pending')::int AS pending
    ),
    attempt AS (INSERT INTO comment_attempts (ip_hash) SELECT $6 FROM counts WHERE recent < $7),
    saved AS (
      INSERT INTO comments (post_id, locale, name, email, body)
      SELECT $1, $2, $3, $4, $5 FROM counts WHERE recent < $7 AND pending < $8
      RETURNING id
    )
    SELECT recent, pending, (SELECT count(*) FROM saved)::int AS saved FROM counts`,
    [input.postId, input.locale, input.name, input.email, input.body, input.ipHash, LIMITS.perIpPer10Min, LIMITS.pendingMax]);
  if (Number(row.saved) === 1) return 'ok';
  return Number(row.recent) >= LIMITS.perIpPer10Min ? 'limit' : 'full';
}

export async function listAll(): Promise<Comment[]> {
  const rows = await db(`SELECT id, post_id, locale, name, email, body, status, created_at FROM comments ORDER BY (status = 'pending') DESC, created_at DESC LIMIT 1000`);
  return rows.map(toComment);
}

export async function approve(id: string): Promise<void> {
  await db(`UPDATE comments SET status = 'approved', approved_at = now() WHERE id = $1`, [id]);
}

export async function remove(id: string): Promise<void> {
  await db(`DELETE FROM comments WHERE id = $1`, [id]);
}
