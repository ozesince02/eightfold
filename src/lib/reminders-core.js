// When is a habit due? Pure functions of the data and a Date, so they can be tested in Node.
import { monthKey, minutesOf, pad } from './dates.js';

export const LATE_WINDOW = 120; // minutes after the nudge during which a missed one still fires
export const SNOOZE_MINUTES = 10;

const DEFAULTS = { enabled: false, lead: 0, off: {}, log: {} };
export const settingsOf = (state) => ({ ...DEFAULTS, ...state.reminders });
export const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const logKey = (date, id) => `${dateKey(date)}:${id}`;

// Habits that have a time, are switched on, started by today and are not ticked yet.
function candidates(state, date) {
  const r = settingsOf(state);
  const month = state.months[monthKey(date.getFullYear(), date.getMonth() + 1)];
  if (!month) return [];
  const d = date.getDate();
  return month.habits
    .filter((h) => h.time && !r.off[h.id] && (h.start || 1) <= d && !month.checks[h.id]?.includes(d))
    .sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
}

// The reminders that should fire right now.
export function dueReminders(state, date = new Date()) {
  const r = settingsOf(state);
  if (!r.enabled) return [];
  const mins = date.getHours() * 60 + date.getMinutes();
  return candidates(state, date).flatMap((h) => {
    const key = logKey(date, h.id);
    const log = r.log[key];
    const at = minutesOf(h.time) - r.lead;
    if (log?.snoozeUntil) return date.getTime() >= log.snoozeUntil ? [{ habit: h, key, late: true }] : [];
    if (log?.firedAt) return [];
    if (mins < at || mins >= at + LATE_WINDOW) return [];
    return [{ habit: h, key, late: mins > minutesOf(h.time) }];
  });
}

// The next reminder still to come today, for the "next nudge" line.
export function nextReminder(state, date = new Date()) {
  const r = settingsOf(state);
  if (!r.enabled) return null;
  const mins = date.getHours() * 60 + date.getMinutes();
  return candidates(state, date)
    .map((h) => ({ habit: h, at: minutesOf(h.time) - r.lead }))
    .filter((x) => x.at > mins)
    .sort((a, b) => a.at - b.at)[0] || null;
}
