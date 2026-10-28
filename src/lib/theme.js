// The reader's paper (D-033): light, warm or dark, or auto (follow the device). Saved per
// device, like reminders, because the right paper depends on the room you're in, not the account.
// public/theme.js applies it before the first paint; this keeps it up to date afterwards.
import { THEME_KEY } from '../config.js';

export const THEMES = [
  { id: 'auto', label: 'Auto', hint: 'Follows your device' },
  { id: 'light', label: 'Light', hint: 'Washi in daylight' },
  { id: 'warm', label: 'Warm', hint: 'Sepia, for the evening' },
  { id: 'dark', label: 'Dark', hint: 'Black washi, for the night' },
];
const IDS = THEMES.map((t) => t.id);
const night = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
const listeners = new Set();

export function themeChoice() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return IDS.includes(saved) ? saved : 'auto';
  } catch {
    return 'auto';
  }
}

// The paper actually on the page right now.
export const activeTheme = () => document.documentElement.dataset.theme || 'light';

function apply(choice) {
  const theme = choice === 'auto' ? (night?.matches ? 'dark' : 'light') : choice;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.themeChoice = choice;
  // The browser's own bar (phones) takes the page's ground colour.
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  if (bg) document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bg));
  listeners.forEach((fn) => fn(theme, choice));
}

export function setTheme(choice) {
  if (!IDS.includes(choice)) return;
  try {
    if (choice === 'auto') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch { /* private window: it still changes for this visit */ }
  apply(choice);
}

// Call once per page: follows the device when on auto, and another tab changing the paper.
export function watchTheme() {
  apply(themeChoice());
  night?.addEventListener?.('change', () => { if (themeChoice() === 'auto') apply('auto'); });
  window.addEventListener('storage', (e) => { if (e.key === THEME_KEY || e.key === null) apply(themeChoice()); });
}

// For things drawn outside CSS (the 3D crane, canvases) that need to redraw with the paper.
export function onThemeChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// A role token's current value, for code that can't use var() (WebGL colours).
export const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
