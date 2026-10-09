/*
  The page theme, shared by the toggle in the bar and the pull-tab on the edge.
  The first paint already has the right theme (inline script in the layout); these only
  switch it. Everything that depends on the theme listens for 'themechange'.
*/
export type Theme = 'light' | 'dark';

const BROWSER_BAR: Record<Theme, string> = { light: '#F8F6F0', dark: '#20252B' };

export const currentTheme = (): Theme => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
export const otherTheme = (theme: Theme): Theme => theme === 'dark' ? 'light' : 'dark';

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach(meta => { meta.content = BROWSER_BAR[theme]; });
  window.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
}

/** Remembers the visitor's choice; storage can be unavailable (private mode). */
export function saveTheme(theme: Theme) {
  try { localStorage.setItem('theme', theme); } catch {}
}

export function savedTheme(): Theme | null {
  try { const value = localStorage.getItem('theme'); return value === 'light' || value === 'dark' ? value : null; } catch { return null; }
}

type ViewTransition = { ready: Promise<void>; finished: Promise<void>; skipTransition: () => void };
/** View Transitions, where the browser has them. */
export const startViewTransition = (update: () => void): ViewTransition | null => {
  const doc = document as Document & { startViewTransition?: (update: () => void) => ViewTransition };
  return doc.startViewTransition ? doc.startViewTransition(update) : null;
};
