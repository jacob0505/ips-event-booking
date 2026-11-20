import { useSyncExternalStore } from 'react';

const KEY = 'theme';
const listeners = new Set();

function readInitial() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* storage unavailable */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

let current = readInitial();

function apply(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function notify() {
  listeners.forEach((l) => l());
}

function setTheme(theme) {
  current = theme;
  try { localStorage.setItem(KEY, theme); } catch { /* ignore */ }
  apply(theme);
  notify();
}

// Applied once when the app loads, so every page (public, login, admin) starts with the same theme.
apply(current);

// Keep other open tabs in sync.
window.addEventListener('storage', (e) => {
  if (e.key === KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
    current = e.newValue;
    apply(current);
    notify();
  }
});

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export default function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current);
  const toggle = () => setTheme(current === 'dark' ? 'light' : 'dark');
  return { theme, toggle };
}