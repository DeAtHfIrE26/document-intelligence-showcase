export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'dif-showcase-theme';

function stored(): Theme | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export function systemTheme(): Theme {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

/** The theme to show: a saved choice, the URL (?theme=light), or the system setting. */
export function initialTheme(search = window.location.search): Theme {
  const fromUrl = new URLSearchParams(search).get('theme');
  if (fromUrl === 'light' || fromUrl === 'dark') return fromUrl;
  return stored() ?? systemTheme();
}

export function applyTheme(theme: Theme, persist = false): void {
  document.documentElement.dataset.theme = theme;
  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Private mode or blocked storage: the choice lasts for this page only
    }
  }
}
