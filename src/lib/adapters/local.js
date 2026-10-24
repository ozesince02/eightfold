// Where data lives on this device. store.js talks only to an adapter with this shape, so a
// Supabase adapter can sit beside it later without the screens changing (docs/data-storage.md):
//   mode          'local' now; a synced adapter will report 'synced'
//   load()        the saved text, or null
//   save(text)    true when the browser actually stored it
//   keepAside(raw) park unreadable data under a dated key instead of losing it
//   protection()  'persistent' | 'best-effort' | 'unknown': may the browser clear it on its own?
//   protect()     ask the browser to keep the data permanently

import { STORE_KEY, LEGACY_STORE_KEY as LEGACY_KEY } from '../../config.js';

export { STORE_KEY };

export const localAdapter = {
  mode: 'local',

  load() {
    try { return localStorage.getItem(STORE_KEY) ?? localStorage.getItem(LEGACY_KEY); } catch { return null; }
  },

  save(text) {
    try { localStorage.setItem(STORE_KEY, text); return true; } catch { return false; }
  },

  keepAside(raw) {
    try { localStorage.setItem(`${STORE_KEY}:unreadable:${Date.now()}`, raw); } catch { /* storage full */ }
  },

  async protection() {
    if (!navigator.storage?.persisted) return 'unknown';
    try { return (await navigator.storage.persisted()) ? 'persistent' : 'best-effort'; } catch { return 'unknown'; }
  },

  // Chrome and Edge decide quietly; Firefox may ask the person. Call it after a click, not on load.
  async protect() {
    if (!navigator.storage?.persist) return 'unknown';
    try { return (await navigator.storage.persist()) ? 'persistent' : 'best-effort'; } catch { return 'unknown'; }
  },
};
