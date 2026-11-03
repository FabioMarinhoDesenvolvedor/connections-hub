import { neon } from '@neondatabase/serverless';

/*
  The comments database. In production, Neon Postgres over HTTP (DATABASE_URL, set by the
  Vercel integration). For local work, DATABASE_URL=pglite:./.pglite runs a real Postgres
  inside Node (PGlite, a dev dependency), so the same SQL is tested without a server.
  The table is created on first use.
*/
type Row = Record<string, unknown>;
type Query = (text: string, params?: unknown[]) => Promise<Row[]>;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id text NOT NULL,
  locale text NOT NULL,
  name text NOT NULL,
  email text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);
CREATE INDEX IF NOT EXISTS comments_by_post ON comments (post_id, status, created_at);
CREATE TABLE IF NOT EXISTS comment_attempts (
  ip_hash text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comment_attempts_by_ip ON comment_attempts (ip_hash, at);
`;

/** The comments cannot be reached: not configured, or the database is down. */
export class DatabaseUnavailable extends Error {}

// Two cold starts creating the tables at once: the loser sees the object the winner just made.
const ALREADY_EXISTS = new Set(['42P07', '42710', '23505']);
const ignoreRace = (error: unknown) => { if (!ALREADY_EXISTS.has((error as { code?: string })?.code ?? '')) throw error; };

let ready: Promise<Query> | null = null;

async function connect(): Promise<Query> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new DatabaseUnavailable('DATABASE_URL is not set');
  let query: Query;
  if (url.startsWith('pglite:')) {
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL) throw new DatabaseUnavailable('PGlite is for local work only');
    // One instance per process: the dev server loads pages and routes as separate module
    // graphs, and two PGlite instances on one folder would each see their own data.
    const shared = globalThis as typeof globalThis & { __commentsPglite?: Promise<import('@electric-sql/pglite').PGlite> };
    shared.__commentsPglite ??= import('@electric-sql/pglite').then(async ({ PGlite }) => {
      const instance = new PGlite(url.slice('pglite:'.length) || undefined);
      await instance.exec(SCHEMA);
      return instance;
    }).catch(error => { shared.__commentsPglite = undefined; throw error; });
    const db = await shared.__commentsPglite;
    query = async (text, params) => (await db.query<Row>(text, params)).rows;
  } else {
    const sql = neon(url);
    for (const statement of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) await sql.query(statement).catch(ignoreRace);
    query = (text, params) => sql.query(text, params) as Promise<Row[]>;
  }
  return query;
}

/** Runs one parameterised statement ($1, $2…). Values are never concatenated into SQL. */
export async function db(text: string, params: unknown[] = []): Promise<Row[]> {
  ready ??= connect().catch(error => { ready = null; throw error; });
  try {
    return (await ready)(text, params);
  } catch (error) {
    // A network error, a timeout or a suspended database reads as "unavailable" to callers;
    // the cause stays in the server log.
    if (error instanceof DatabaseUnavailable) throw error;
    console.error('comments database:', error);
    throw new DatabaseUnavailable('database error');
  }
}
