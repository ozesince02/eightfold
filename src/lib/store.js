// The whole tracker lives in one object in localStorage. No formulas: every number
// on screen is computed from `months[key].checks` by stats.js.
import { SEED_MONTHS, HABIT_COLORS } from '../data/seed.js';
import { monthKey, parseKey, shiftMonth } from './dates.js';

export const STORE_KEY = 'eightfold:v1';
const LEGACY_KEY = 'orizuru:v1'; // the app's working name before it became Eightfold
const PALETTE = ['#C8302C', '#24496B', '#8EA46B', '#E9B33F', '#C9A57A', '#A9CBD6', '#E8C3BC', '#6E8C8A', '#B98A5E', '#D98E73'];

function fromSeed() {
  const months = {};
  for (const [key, habits] of Object.entries(SEED_MONTHS)) {
    months[key] = {
      habits: habits.map(({ id, name, goal, time, start }) => ({ id, name, goal, time: time || '', start: start || 1 })),
      checks: Object.fromEntries(habits.map((h) => [h.id, [...h.days]])),
    };
  }
  return { version: 1, wish: '', colors: { ...HABIT_COLORS }, months };
}

function read() {
  try {
    const raw = localStorage.getItem(STORE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1 && parsed.months) return parsed;
    }
  } catch { /* private mode or corrupt data: fall back to the sheet */ }
  return fromSeed();
}

let state = read();
const listeners = new Set();

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
  listeners.forEach((fn) => fn(state));
}

export const DEFAULT_REMINDERS = { enabled: false, lead: 0, off: {}, log: {} };

export const store = {
  get: () => state,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  // Another tab changed the data: take its copy instead of reloading the page.
  reloadFromStorage() {
    state = read();
    listeners.forEach((fn) => fn(state));
  },

  // Display preferences. percentView: 'days' | 'goal' | 'both', the view the tracker opens with.
  prefs() {
    state.prefs = { percentView: 'days', ...state.prefs };
    return state.prefs;
  },
  setPref(key, value) { this.prefs()[key] = value; save(); },

  // Reminder settings: on/off, minutes of warning, habits switched off, and what fired today.
  reminders() {
    state.reminders = { ...DEFAULT_REMINDERS, ...state.reminders };
    return state.reminders;
  },
  setReminders(patch) { Object.assign(this.reminders(), patch); save(); },
  setHabitReminder(id, on) {
    const off = this.reminders().off;
    if (on) delete off[id]; else off[id] = true;
    save();
  },
  // log keys are "YYYY-MM-DD:habitId"; anything older than three days is dropped.
  logReminder(key, patch) {
    const log = this.reminders().log;
    log[key] = { ...log[key], ...patch };
    const cutoff = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    for (const k of Object.keys(log)) if (k.slice(0, 10) < cutoff) delete log[k];
    save();
  },

  month(key) { return state.months[key] || null; },

  // A new month starts with last month's habits and an empty grid, the way
  // copying a tab worked in the sheet, minus the copying.
  ensureMonth(key) {
    if (state.months[key]) return state.months[key];
    const { y, m } = parseKey(key);
    let prev = null;
    for (let back = 1; back <= 12 && !prev; back++) {
      const p = shiftMonth(y, m, -back);
      prev = state.months[monthKey(p.y, p.m)];
    }
    const habits = prev ? prev.habits.map((h) => ({ ...h, start: 1 })) : [];
    state.months[key] = { habits, checks: Object.fromEntries(habits.map((h) => [h.id, []])) };
    save();
    return state.months[key];
  },

  isChecked(key, id, day) {
    return !!state.months[key]?.checks[id]?.includes(day);
  },

  toggle(key, id, day, value) {
    const month = this.ensureMonth(key);
    const list = month.checks[id] || (month.checks[id] = []);
    const has = list.includes(day);
    const want = value === undefined ? !has : value;
    if (want === has) return has;
    if (want) { list.push(day); list.sort((a, b) => a - b); } else list.splice(list.indexOf(day), 1);
    save();
    return want;
  },

  color(id) {
    if (!state.colors[id]) {
      state.colors[id] = PALETTE[Object.keys(state.colors).length % PALETTE.length];
    }
    return state.colors[id];
  },
  setColor(id, color) { state.colors[id] = color; save(); },

  addHabit(key, { name, goal = 20, time = '', start = 1, id }) {
    const month = this.ensureMonth(key);
    const slug = id || (name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'habit') + '-' + Date.now().toString(36).slice(-4);
    month.habits.push({ id: slug, name, goal: Number(goal) || 0, time, start: Number(start) || 1 });
    month.checks[slug] = month.checks[slug] || [];
    this.color(slug);
    save();
    return slug;
  },

  updateHabit(key, id, patch) {
    const habit = state.months[key]?.habits.find((h) => h.id === id);
    if (!habit) return;
    Object.assign(habit, patch);
    if ('goal' in patch) habit.goal = Number(patch.goal) || 0;
    if ('start' in patch) habit.start = Math.max(1, Number(patch.start) || 1);
    save();
  },

  removeHabit(key, id) {
    const month = state.months[key];
    if (!month) return;
    month.habits = month.habits.filter((h) => h.id !== id);
    delete month.checks[id];
    save();
  },

  moveHabit(key, id, delta) {
    const list = state.months[key]?.habits;
    if (!list) return;
    const i = list.findIndex((h) => h.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    save();
  },

  setWish(text) { state.wish = text; save(); },

  exportJSON: () => JSON.stringify(state, null, 2),
  importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || parsed.version !== 1 || typeof parsed.months !== 'object') throw new Error('This file is not an Eightfold backup.');
    state = parsed;
    save();
  },
  resetToSheet() {
    const reminders = state.reminders;
    state = fromSeed();
    if (reminders) state.reminders = { ...reminders, log: {} };
    save();
  },
};
