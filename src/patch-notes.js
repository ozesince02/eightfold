// The patch notes page (D-032): every version as a torn sheet on the table, newest first.
// The text is fixed in src/data/patch-notes.js; it's still escaped on the way in.
import { PATCHES, NEXT } from './data/patch-notes.js';
import { APP_PATH } from './config.js';
import { esc } from './lib/sanitize.js';
import { tearAll } from './ui/paper.js';
import { markPatchSeen } from './lib/patches.js';
import { noteTrigger, wireCraneNotes } from './ui/note-trigger.js';
import { watchTheme } from './lib/theme.js';

watchTheme();

const $ = (s) => document.querySelector(s);
const longDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const TILTS = [-0.8, 0.6, -0.4, 0.9, -0.6];

$('[data-app-link]').href = APP_PATH;

// The tape and the sticker sit outside the torn sheet: its clip-path would cut them off.
$('[data-patches]').innerHTML = PATCHES.map((p, i) => `
  <li class="patch-item sheet-wrap tilt" style="--r:${TILTS[i % TILTS.length]}deg">
    <span class="tape" style="left:${18 + (i * 23) % 60}%;transform:rotate(${i % 2 ? 3 : -4}deg)" aria-hidden="true"></span>
    <article class="sheet" data-tear="trbl" data-amp="5" data-seed="${61 + i * 7}" aria-labelledby="patch-${i}">
      <div class="patch-stamp" aria-hidden="true"><small>Patch</small>${esc(p.version)}</div>
      <div class="patch-body">
        <p class="patch-date"><span class="visually-hidden">Patch ${esc(p.version)}, </span><time datetime="${esc(p.date)}">${esc(longDate(p.date))}</time>${i === 0 ? ' <span class="patch-latest">Latest</span>' : ''}</p>
        <h2 id="patch-${i}">${esc(p.title)}</h2>
        <ul>${p.notes.map(([lead, text]) => `<li><b>${esc(lead)}</b> ${esc(text)}</li>`).join('')}</ul>
      </div>
    </article>
    <span class="sfx patch-item-sfx" lang="ja" aria-hidden="true">${esc(p.sticker)}</span>
  </li>`).join('');

$('[data-next]').innerHTML = NEXT.map((n) => `<li>${esc(n)}</li>`).join('');

// Why this page exists, from the person who made it: a crane note (D-031).
$('[data-note-slot]').innerHTML = noteTrigger('patch-notes', 'Why patch notes?');
wireCraneNotes();

tearAll();
markPatchSeen();
