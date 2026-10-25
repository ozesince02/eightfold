// Where data lives on this device. store.js talks only to an adapter with this shape, so a
// Supabase adapter can sit beside it later without the screens changing (docs/data-storage.md):
//   mode          'local' now; a synced adapter will report 'synced'
//   load()        the saved text, or null
//   save(text)    true when the browser actually stored it
//   keepAside(raw) park unreadable data under a dated key instead of losing it
//   protection()  'persistent' | 'best-effort' | 'unknown': may the browser clear it on its own?
//   protect()     ask the browser to keep the data permanently
//   clearAll()    remove every Eightfold key from this browser (signing out on a shared computer)

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

  // The sync queue (D-020): changes not yet sent to the account, kept across reloads and offline.
  loadSync() {
    try { return JSON.parse(localStorage.getItem(`${STORE_KEY}:sync`) || '{}'); } catch { return {}; }
  },
  saveSync(obj) {
    try { localStorage.setItem(`${STORE_KEY}:sync`, JSON.stringify(obj)); } catch { /* storage full: the next save retries */ }
  },

  // Everything Eightfold keeps here: the tracker, the sync queue, copies kept aside (including
  // another account's on a shared browser) and data saved under the old name. Nothing else.
  clearAll() {
    try {
      const ours = (k) => k === STORE_KEY || k === LEGACY_KEY || k.startsWith(`${STORE_KEY}:`) || k.startsWith(`${LEGACY_KEY}:`);
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && ours(k)) keys.push(k); }
      keys.forEach((k) => localStorage.removeItem(k));
      return true;
    } catch { return false; }
  },

  // Chrome and Edge decide quietly; Firefox may ask the person. Call it after a click, not on load.
  async protect() {
    if (!navigator.storage?.persist) return 'unknown';
    try { return (await navigator.storage.persist()) ? 'persistent' : 'best-effort'; } catch { return 'unknown'; }
  },
};
