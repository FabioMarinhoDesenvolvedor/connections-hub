import { db } from '@/lib/comments/db';

/*
  Drafts of posts written in the admin editor. A draft lives here while it is being written
  (saved as it is typed); asking for a review writes it to the repository as a pull request,
  and publishing merges it. The Markdown file in content/blog stays the source of the site.
  Images are kept here as WebP (base64) until they are committed next to the post.
*/
export type DraftStatus = 'draft' | 'review' | 'published';
export type Draft = {
  id: string; title: string; slug: string; description: string; kind: string; tags: string; tldr: string; body: string;
  status: DraftStatus; folder: string | null; branch: string | null; prNumber: number | null; updatedAt: Date;
};
export type DraftFields = Pick<Draft, 'title' | 'slug' | 'description' | 'kind' | 'tags' | 'tldr' | 'body'>;
export type DraftImage = { name: string; width: number; height: number };

export const FIELD_LIMITS: Record<keyof DraftFields, number> = { title: 140, slug: 80, description: 300, kind: 20, tags: 200, tldr: 600, body: 200_000 };

const toDraft = (r: Record<string, unknown>): Draft => ({
  id: String(r.id), title: String(r.title), slug: String(r.slug), description: String(r.description), kind: String(r.kind),
  tags: String(r.tags), tldr: String(r.tldr), body: String(r.body), status: r.status as DraftStatus,
  folder: r.folder ? String(r.folder) : null, branch: r.branch ? String(r.branch) : null,
  prNumber: r.pr_number === null || r.pr_number === undefined ? null : Number(r.pr_number), updatedAt: new Date(r.updated_at as string),
});

const COLUMNS = 'id, title, slug, description, kind, tags, tldr, body, status, folder, branch, pr_number, updated_at';

export async function listDrafts(): Promise<Draft[]> {
  return (await db(`SELECT ${COLUMNS} FROM post_drafts WHERE status <> 'published' ORDER BY updated_at DESC LIMIT 200`)).map(toDraft);
}

export async function getDraft(id: string): Promise<Draft | null> {
  const [row] = await db(`SELECT ${COLUMNS} FROM post_drafts WHERE id = $1`, [id]);
  return row ? toDraft(row) : null;
}

export async function createDraft(): Promise<string> {
  const [row] = await db(`INSERT INTO post_drafts DEFAULT VALUES RETURNING id`);
  return String(row.id);
}

/** Saves the fields. The address (slug) is fixed once a review exists: the branch is named after it. */
export async function saveDraft(id: string, fields: DraftFields): Promise<void> {
  await db(`UPDATE post_drafts SET title = $2, slug = CASE WHEN status = 'draft' THEN $3 ELSE slug END, description = $4, kind = $5, tags = $6, tldr = $7, body = $8, updated_at = now() WHERE id = $1`,
    [id, fields.title, fields.slug, fields.description, fields.kind, fields.tags, fields.tldr, fields.body]);
}

export async function markReview(id: string, review: { folder: string; branch: string; prNumber: number }): Promise<void> {
  await db(`UPDATE post_drafts SET status = 'review', folder = $2, branch = $3, pr_number = $4, updated_at = now() WHERE id = $1`, [id, review.folder, review.branch, review.prNumber]);
}

export async function markPublished(id: string): Promise<void> {
  await db(`UPDATE post_drafts SET status = 'published', updated_at = now() WHERE id = $1`, [id]);
  await db(`DELETE FROM post_images WHERE draft_id = $1`, [id]); // now in the repository
}

export async function deleteDraft(id: string): Promise<void> {
  await db(`DELETE FROM post_drafts WHERE id = $1`, [id]);
}

export async function listImages(id: string): Promise<DraftImage[]> {
  return (await db(`SELECT name, width, height FROM post_images WHERE draft_id = $1 ORDER BY name`, [id])).map(r => ({ name: String(r.name), width: Number(r.width), height: Number(r.height) }));
}

export async function imageData(id: string, name: string): Promise<Buffer | null> {
  const [row] = await db(`SELECT data FROM post_images WHERE draft_id = $1 AND name = $2`, [id, name]);
  return row ? Buffer.from(String(row.data), 'base64') : null;
}

export async function addImage(id: string, image: DraftImage & { data: Buffer }): Promise<void> {
  await db(`INSERT INTO post_images (draft_id, name, data, width, height) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (draft_id, name) DO UPDATE SET data = EXCLUDED.data, width = EXCLUDED.width, height = EXCLUDED.height`,
    [id, image.name, image.data.toString('base64'), image.width, image.height]);
}

export async function removeImage(id: string, name: string): Promise<void> {
  await db(`DELETE FROM post_images WHERE draft_id = $1 AND name = $2`, [id, name]);
}
