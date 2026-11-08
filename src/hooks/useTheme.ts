import { useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'musas-sonideras:theme';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// A single module-level store, shared by every caller of useTheme(), rather than each
// component keeping its own independent useState — otherwise toggling the theme in one
// place (the header button) never notifies the others (e.g. the network graph), which is
// exactly what made theme-dependent colors unreliable.
let theme: Theme = getInitialTheme();
const listeners = new Set<() => void>();

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem(STORAGE_KEY, t);
}
applyTheme(theme);

function setTheme(t: Theme) {
  theme = t;
  applyTheme(theme);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Theme {
  return theme;
}

export function useTheme(): [Theme, () => void] {
  const current = useSyncExternalStore(subscribe, getSnapshot);
  const toggle = () => setTheme(current === 'light' ? 'dark' : 'light');
  return [current, toggle];
}
