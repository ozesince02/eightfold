// Everything that enters the app from outside its own code (a backup file, stored data,
// a URL) passes through here. Two rules (docs/security.md):
//   1. Validate on the way in: only known keys, known formats, sane sizes.
//   2. Escape on the way out: free text goes through esc() before it touches HTML.

import { daysIn } from './dates.js';
import { CADENCES } from './schedule.js';

export const LIMITS = {
  backupBytes: 5 * 1024 * 1024, // a decade of ticks is well under 1 MB
  months: 240,
  habitsPerMonth: 50,
  name: 120,
  wish: 200,
};

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const VIEWS = ['days', 'goal', 'both'];
const LEADS = [0, 5, 10, 15, 30];

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const isId = (s) => typeof s === 'string' && ID.test(s);
export const isDate = (s) => typeof s === 'string' && DATE.test(s);
export const safeColor = (c, fallback = '#C9A57A') => (typeof c === 'string' && HEX.test(c) ? c : fallback);
export const safeTime = (t) => (typeof t === 'string' && TIME.test(t) ? t : '');
export const safeName = (s) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, LIMITS.name) : '');
const int = (v, min, max, fallback) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};
const isObject = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);

class BackupError extends Error {}

// A habit's schedule (D-013). Daily habits carry no extra keys, so older data stays as it was.
export function cleanSchedule(h) {
  const cadence = CADENCES.includes(h?.cadence) ? h.cadence : 'daily';
  if (cadence === 'weekdays') {
    const days = Array.isArray(h.weekdays) ? [...new Set(h.weekdays.map((d) => int(d, 1, 7, 0)).filter(Boolean))].sort((a, b) => a - b) : [];
    return days.length ? { cadence, weekdays: days } : {};
  }
  if (cadence === 'times_per_week') return { cadence, timesPerWeek: int(h.timesPerWeek, 1, 7, 3) };
  if (cadence === 'weekly' || cadence === 'monthly') return { cadence };
  return {};
}

// Returns a clean copy of an Eightfold state object, or throws BackupError with a plain reason.
// Unknown keys are dropped; bad values are corrected or dropped, never passed through.
export function cleanState(input) {
  if (!isObject(input)) throw new BackupError('This file is not an Eightfold backup.');
  if (input.version !== 1) throw new BackupError('This backup is from a version of Eightfold this one can\'t read.');
  if (!isObject(input.months)) throw new BackupError('This backup has no months in it.');

  const keys = Object.keys(input.months).filter((k) => MONTH.test(k)).sort().slice(-LIMITS.months);
  const months = {};
  const ids = new Set();
  for (const key of keys) {
    const src = input.months[key];
    if (!isObject(src) || !Array.isArray(src.habits)) continue;
    const [, y, m] = key.match(MONTH).map(Number);
    const last = daysIn(y, m);
    const seen = new Set();
    const habits = [];
    for (const h of src.habits.slice(0, LIMITS.habitsPerMonth)) {
      if (!isObject(h) || !isId(h.id) || seen.has(h.id)) continue;
      const name = safeName(h.name);
      if (!name) continue;
      seen.add(h.id);
      ids.add(h.id);
      habits.push({ id: h.id, name, goal: int(h.goal, 0, 31, 20), time: safeTime(h.time), start: int(h.start, 1, last, 1), ...cleanSchedule(h) });
    }
    const checks = {};
    const srcChecks = isObject(src.checks) ? src.checks : {};
    for (const h of habits) {
      const days = Array.isArray(srcChecks[h.id]) ? srcChecks[h.id] : [];
      checks[h.id] = [...new Set(days.map((d) => int(d, 1, last, 0)).filter(Boolean))].sort((a, b) => a - b);
    }
    months[key] = { habits, checks };
  }

  const colors = {};
  if (isObject(input.colors)) {
    for (const [id, c] of Object.entries(input.colors)) if (isId(id) && HEX.test(c)) colors[id] = c;
  }

  const out = {
    version: 1,
    wish: typeof input.wish === 'string' ? input.wish.slice(0, LIMITS.wish) : '',
    colors,
    months,
  };

  if (isObject(input.prefs)) {
    out.prefs = { percentView: VIEWS.includes(input.prefs.percentView) ? input.prefs.percentView : 'days' };
  }
  if (isObject(input.meta)) {
    const time = (v) => (Number.isFinite(v) && v > 0 ? v : undefined);
    out.meta = {
      firstUsedAt: time(input.meta.firstUsedAt),
      lastBackupAt: time(input.meta.lastBackupAt),
      backupSnoozedUntil: time(input.meta.backupSnoozedUntil),
    };
  }
  if (isObject(input.reminders)) {
    const r = input.reminders;
    const off = {};
    if (isObject(r.off)) for (const id of Object.keys(r.off)) if (isId(id) && r.off[id] === true) off[id] = true;
    const log = {};
    if (isObject(r.log)) {
      for (const [k, v] of Object.entries(r.log)) {
        const [date, id] = k.split(':');
        if (!isDate(date) || !isId(id) || !isObject(v)) continue;
        log[k] = {
          firedAt: Number.isFinite(v.firedAt) ? v.firedAt : undefined,
          snoozeUntil: Number.isFinite(v.snoozeUntil) ? v.snoozeUntil : null,
        };
      }
    }
    out.reminders = { enabled: r.enabled === true, lead: LEADS.includes(r.lead) ? r.lead : 0, off, log };
  }
  return out;
}

export function parseBackup(text) {
  if (typeof text !== 'string') throw new BackupError('That file could not be read.');
  if (text.length > LIMITS.backupBytes) throw new BackupError('That file is too large to be an Eightfold backup.');
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new BackupError('That file is not valid JSON.'); }
  return cleanState(parsed);
}
