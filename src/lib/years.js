// Years (D-017). Months are stored by key ("2026-10"), so a new year is just more months. This file
// holds the rules around them: how far the tracker lets you travel, which wish belongs to which
// year, and when it's time to fold the year.
import { monthKey, shiftMonth } from './dates.js';

// The earliest month worth showing: the first one with a habit in it. Nothing before you started.
export function firstMonthKey(state, now) {
  const keys = Object.keys(state.months).filter((k) => state.months[k].habits.length).sort();
  const current = monthKey(now.y, now.m);
  return keys[0] && keys[0] < current ? keys[0] : current;
}

// The latest month you can open: next month, so it can be set up ahead of time.
export function lastMonthKey(now) {
  const next = shiftMonth(now.y, now.m, 1);
  return monthKey(next.y, next.m);
}

export function clampKey(key, state, now) {
  const first = firstMonthKey(state, now);
  const last = lastMonthKey(now);
  return key < first ? first : key > last ? last : key;
}

export function yearBounds(state, now) {
  return { first: Number(firstMonthKey(state, now).slice(0, 4)), last: Number(lastMonthKey(now).slice(0, 4)) };
}

export const wishOf = (state, y) => state.years?.[y]?.wish || '';
export const foldedAt = (state, y) => state.years?.[y]?.foldedAt || null;

// "Fold the year" opens from 1 December to 31 January for the year that is ending (or just ended),
// as long as that year has folds in it and hasn't been folded yet.
export function yearToFold(state, now) {
  const y = now.m === 12 ? now.y : now.m === 1 ? now.y - 1 : null;
  if (y === null || foldedAt(state, y)) return null;
  const hasData = Object.entries(state.months).some(([k, mo]) => k.startsWith(`${y}-`) && Object.values(mo.checks).some((d) => d.length));
  return hasData ? y : null;
}

// The habits a year ends with: December's, or the last month of that year that has any.
export function closingHabits(state, y) {
  for (let m = 12; m >= 1; m--) {
    const mo = state.months[monthKey(y, m)];
    if (mo?.habits.length) return mo.habits;
  }
  return [];
}
