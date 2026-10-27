// The way into a crane note (D-031): a small paper crane with a label, beside a feature's heading.
// This file stays light; the note itself (Three.js and all) loads only when someone hovers, focuses
// or taps a crane.
import { craneMark } from './paper.js';
import { esc } from '../lib/sanitize.js';

export const noteTrigger = (id, label) =>
  `<button class="note-crane" type="button" aria-haspopup="dialog" data-crane-note="${esc(id)}">${craneMark()}<span>${esc(label)}</span></button>`;

let loading = null;
const load = () => (loading ||= import('./crane-note.js').catch((err) => { loading = null; throw err; }));

// One listener for the whole page, so triggers rendered later work too.
export function wireCraneNotes(root = document) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest?.('[data-crane-note]');
    if (!btn) return;
    load().then((m) => m.openCraneNote(btn.dataset.craneNote, btn)).catch(() => {});
  });
  const warm = (e) => { if (e.target.closest?.('[data-crane-note]')) load().catch(() => {}); };
  root.addEventListener('pointerover', warm);
  root.addEventListener('focusin', warm);
}
