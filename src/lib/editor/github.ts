/*
  The editor's hands on the repository, through the GitHub REST API with a fine-grained token
  limited to this one repository (GITHUB_CONTENT_TOKEN: Contents and Pull requests read and
  write, Commit statuses and Deployments read). Nothing here runs without the owner's session.

  Review: one commit with the post and its images on a branch post/<slug>, and a pull request
  to main; Vercel builds a preview of it. Publish: merge the pull request and delete the branch.
  GITHUB_API_URL can point elsewhere for tests.
*/
const API = () => process.env.GITHUB_API_URL || 'https://api.github.com';
const REPO = () => process.env.GITHUB_REPO || 'FabioMarinhoDesenvolvedor/connections-hub';
const TIMEOUT = 15_000;

export class GithubNotConfigured extends Error {}
export class GithubError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const githubConfigured = () => Boolean(process.env.GITHUB_CONTENT_TOKEN);

async function gh<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = process.env.GITHUB_CONTENT_TOKEN;
  if (!token) throw new GithubNotConfigured('GITHUB_CONTENT_TOKEN is not set');
  const response = await fetch(`${API()}/repos/${REPO()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'connections-hub-editor', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new GithubError(response.status, (data as { message?: string }).message ?? response.statusText);
  return data as T;
}

const headOf = async (branch: string) => (await gh<{ object: { sha: string } }>('GET', `/git/ref/heads/${branch}`)).object.sha;
export const branchExists = (branch: string) => headOf(branch).then(() => true, (e: unknown) => { if (e instanceof GithubError && e.status === 404) return false; throw e; });

export type ReviewFile = { path: string } & ({ text: string } | { base64: string });

/** Writes the files in one commit on the branch (created from main if new) and opens or reuses the PR. */
export async function pushReview(input: { branch: string; message: string; files: ReviewFile[]; title: string; body: string; prNumber: number | null }): Promise<{ prNumber: number }> {
  const exists = await branchExists(input.branch);
  const parent = await headOf(exists ? input.branch : 'main');
  const baseTree = (await gh<{ tree: { sha: string } }>('GET', `/git/commits/${parent}`)).tree.sha;
  const tree = [];
  for (const file of input.files) {
    if ('text' in file) tree.push({ path: file.path, mode: '100644', type: 'blob', content: file.text });
    else {
      const blob = await gh<{ sha: string }>('POST', '/git/blobs', { content: file.base64, encoding: 'base64' });
      tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
  }
  const newTree = await gh<{ sha: string }>('POST', '/git/trees', { base_tree: baseTree, tree });
  const commit = await gh<{ sha: string }>('POST', '/git/commits', { message: input.message, tree: newTree.sha, parents: [parent] });
  if (exists) await gh('PATCH', `/git/refs/heads/${input.branch}`, { sha: commit.sha });
  else await gh('POST', '/git/refs', { ref: `refs/heads/${input.branch}`, sha: commit.sha });
  if (input.prNumber) {
    const pr = await gh<{ state: string }>('GET', `/pulls/${input.prNumber}`);
    if (pr.state === 'open') return { prNumber: input.prNumber };
  }
  const pr = await gh<{ number: number }>('POST', '/pulls', { title: input.title, head: input.branch, base: 'main', body: input.body });
  return { prNumber: pr.number };
}

export type ReviewState = { prUrl: string; state: 'open' | 'closed' | 'merged'; checks: 'pending' | 'success' | 'failure'; previewUrl: string | null; headSha: string };

/** The pull request, Vercel's check on it and the preview address, for the editor to show. */
export async function reviewState(prNumber: number, branch: string): Promise<ReviewState> {
  const pr = await gh<{ html_url: string; state: string; merged: boolean; head: { sha: string } }>('GET', `/pulls/${prNumber}`);
  const status = await gh<{ state: string; statuses: unknown[] }>('GET', `/commits/${pr.head.sha}/status`);
  let previewUrl: string | null = null;
  const deployments = await gh<{ id: number }[]>('GET', `/deployments?ref=${encodeURIComponent(branch)}&per_page=1`).catch(() => []);
  if (deployments[0]) {
    const statuses = await gh<{ state: string; environment_url?: string }[]>('GET', `/deployments/${deployments[0].id}/statuses?per_page=5`).catch(() => []);
    previewUrl = statuses.find(s => s.state === 'success' && s.environment_url)?.environment_url ?? null;
  }
  const checks = status.statuses.length === 0 || status.state === 'pending' ? 'pending' : status.state === 'success' ? 'success' : 'failure';
  return { prUrl: pr.html_url, state: pr.merged ? 'merged' : pr.state === 'open' ? 'open' : 'closed', checks, previewUrl, headSha: pr.head.sha };
}

/** Merges exactly the commit whose check passed: GitHub refuses (409) if the branch moved since. */
export async function mergeReview(prNumber: number, branch: string, title: string, sha: string): Promise<void> {
  await gh('PUT', `/pulls/${prNumber}/merge`, { merge_method: 'merge', commit_title: `post: ${title}`, sha });
  await gh('DELETE', `/git/refs/heads/${branch}`).catch(() => undefined); // tidy; the merge is what matters
}

export async function closeReview(prNumber: number, branch: string): Promise<void> {
  await gh('PATCH', `/pulls/${prNumber}`, { state: 'closed' }).catch(() => undefined);
  await gh('DELETE', `/git/refs/heads/${branch}`).catch(() => undefined);
}
