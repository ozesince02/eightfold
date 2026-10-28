// When a habit is due (docs/decisions.md D-013). Five cadences:
//   daily           every day from its start day
//   weekdays        only on chosen weekdays (1 = Monday ... 7 = Sunday); other days are rest days
//   times_per_week  N ticks in each week, on any days
//   weekly          one tick in each week
//   monthly         one tick in the month
// Weeks are the sheet's weeks, counted from the 1st (days 1–7, 8–14, ...), like the rest of the app.
import { daysIn, sheetWeeks } from './dates.js';

export const CADENCES = ['daily', 'weekdays', 'times_per_week', 'weekly', 'monthly'];
export const CADENCE_LABELS = {
  daily: 'Every day',
  weekdays: 'On chosen days',
  times_per_week: 'Times a week',
  weekly: 'Once a week',
  monthly: 'Once a month',
};
export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const cadenceOf = (h) => (CADENCES.includes(h?.cadence) ? h.cadence : 'daily');
export const isFlexible = (h) => ['times_per_week', 'weekly', 'monthly'].includes(cadenceOf(h));
export const unitOf = (h) => ({ times_per_week: 'week', weekly: 'week', monthly: 'month' }[cadenceOf(h)] || 'day');

// 1 = Monday ... 7 = Sunday
export const isoWeekday = (y, m, d) => ((new Date(y, m - 1, d).getDay() + 6) % 7) + 1;

// Fixed due days: daily and weekday habits only. Flexible habits have no fixed day.
export function isDueDay(h, y, m, d) {
  if (d < (h.start || 1)) return false;
  const c = cadenceOf(h);
  if (c === 'daily') return true;
  if (c === 'weekdays') return (h.weekdays || []).includes(isoWeekday(y, m, d));
  return false;
}

// How many ticks a week needs. A short week (the 29th to the 31st) asks for a share of N, at least 1.
export function weekTarget(h, length) {
  const c = cadenceOf(h);
  if (c === 'weekly') return 1;
  if (c === 'times_per_week') return Math.min(length, Math.max(1, Math.round(((h.timesPerWeek || 1) * length) / 7)));
  return 0;
}

// Weeks a habit takes part in this month (those that reach its start day), with their targets.
export function habitWeeks(h, y, m) {
  const start = h.start || 1;
  return sheetWeeks(daysIn(y, m))
    .filter((w) => w.to >= start)
    .map((w) => {
      const from = Math.max(w.from, start);
      return { ...w, from, target: weekTarget(h, w.to - from + 1) };
    });
}

// The goal a schedule implies for a month, used when the schedule changes.
export function defaultGoal(h, y, m) {
  const days = daysIn(y, m);
  const c = cadenceOf(h);
  if (c === 'weekdays') {
    let n = 0;
    for (let d = h.start || 1; d <= days; d++) if (isDueDay(h, y, m, d)) n++;
    return n;
  }
  if (c === 'times_per_week' || c === 'weekly') return habitWeeks(h, y, m).reduce((s, w) => s + w.target, 0);
  if (c === 'monthly') return 1;
  return Math.min(20, days - (h.start || 1) + 1);
}

// Short description for a habit's subline: "Mon, Wed", "3 times a week", "once a month".
export function describe(h) {
  const c = cadenceOf(h);
  if (c === 'weekdays') {
    const days = h.weekdays || [];
    if (days.length === 5 && days.every((d) => d <= 5)) return 'weekdays';
    if (days.length === 2 && days.includes(6) && days.includes(7)) return 'weekends';
    return days.map((d) => WEEKDAY_SHORT[d - 1]).join(', ');
  }
  if (c === 'times_per_week') return `${h.timesPerWeek} times a week`;
  if (c === 'weekly') return 'once a week';
  if (c === 'monthly') return 'once a month';
  return 'every day';
}

// The week (from habitWeeks) that contains day d, or null.
export const weekOf = (weeks, d) => weeks.find((w) => d >= w.from && d <= w.to) || null;

// Is this flexible habit still open today? (Not yet met this week or month, or ticked today.)
export function flexibleOpen(h, ticks, y, m, d) {
  const c = cadenceOf(h);
  if (c === 'monthly') return !ticks.some((t) => t !== d);
  const w = weekOf(habitWeeks(h, y, m), d);
  if (!w) return false;
  const inWeek = ticks.filter((t) => t >= w.from && t <= w.to && t !== d).length;
  return inWeek < w.target;
}
