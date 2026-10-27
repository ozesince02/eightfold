// Has this browser seen the newest patch notes (D-032)? A per-device convenience, kept beside the
// store's key so "remove my folds from this browser" clears it too. Losing it only shows the
// account chit's "new" mark once more.
import { STORE_KEY } from '../config.js';
import { LATEST } from '../data/patch-notes.js';

const KEY = `${STORE_KEY}:patch-seen`;

export function patchUnseen() {
  try { return localStorage.getItem(KEY) !== LATEST; } catch { return false; }
}

export function markPatchSeen() {
  try { localStorage.setItem(KEY, LATEST); } catch { /* private window: nothing to remember */ }
}
