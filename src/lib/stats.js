// Everything the sheet's formulas used to do, as plain functions of the data.
import { daysIn, weekday, sheetWeeks, monthKey, shiftMonth } from './dates.js';

export const pct = (a, b) => (b > 0 ? a / b : 0);

// Two ways to read a habit, and a view that shows both (see docs/decisions.md, D-006):
//   days: ticks against the days that have happened so far this month;
//   goal: ticks against the habit's monthly goal, as the sheet's PROGRESS column did.
export const VIEWS = ['days', 'goal', 'both'];
export const VIEW_LABELS = { days: 'Days', goal: 'Goal', both: 'Both' };

// One month, the way a monthly tab showed it.
export function monthStats(month, y, m, now) {
  const days = daysIn(y, m);
  const isCurrent = now && now.y === y && now.m === m;
  const isFuture = now && (y > now.y || (y === now.y && m > now.m));
  const lastDay = isFuture ? 0 : isCurrent ? now.d : days;

  const habits = (month?.habits || []).map((h) => {
    const set = new Set(month.checks[h.id] || []);
    const cells = Array.from({ length: days }, (_, i) => (i + 1 < (h.start || 1) ? null : set.has(i + 1)));
    const done = cells.filter(Boolean).length;
    let run = 0, longest = 0;
    for (const c of cells) { run = c ? run + 1 : 0; longest = Math.max(longest, run); }
    // Days so far: every tracked day up to yesterday, plus today once it is ticked.
    // Today is not over, so an unticked today is not counted as a miss yet.
    let doneSoFar = 0, daysSoFar = 0;
    cells.forEach((c, i) => {
      const d = i + 1;
      if (c === null || d > lastDay) return;
      if (isCurrent && d === now.d && !c) return;
      daysSoFar++;
      if (c) doneSoFar++;
    });
    return {
      ...h,
      cells,
      done,
      possible: cells.filter((c) => c !== null).length,
      left: h.goal - done,
      progress: pct(done, h.goal),
      goalPct: pct(done, h.goal),
      doneSoFar,
      daysSoFar,
      daysPct: pct(doneSoFar, daysSoFar),
      longest,
    };
  });

  const perDay = Array.from({ length: days }, (_, i) => {
    const day = i + 1;
    const live = habits.filter((h) => h.cells[i] !== null);
    const done = live.filter((h) => h.cells[i]).length;
    return { day, weekday: weekday(y, m, day), done, goal: live.length, left: live.length - done, pct: pct(done, live.length), past: day <= lastDay };
  });

  const weeks = sheetWeeks(days).map((w) => {
    const slice = perDay.slice(w.from - 1, w.to);
    const done = slice.reduce((s, d) => s + d.done, 0);
    const possible = slice.reduce((s, d) => s + d.goal, 0);
    return { ...w, done, possible, pct: pct(done, possible) };
  });

  const done = habits.reduce((s, h) => s + h.done, 0);
  const possible = habits.reduce((s, h) => s + h.possible, 0);
  const target = habits.reduce((s, h) => s + (h.goal || 0), 0);
  // A habit past its goal counts as its goal, so one overachiever can't hide the rest.
  const goalMet = habits.reduce((s, h) => s + Math.min(h.done, h.goal || 0), 0);
  const doneSoFar = habits.reduce((s, h) => s + h.doneSoFar, 0);
  const daysSoFar = habits.reduce((s, h) => s + h.daysSoFar, 0);
  const perfectDays = perDay.filter((d) => d.goal > 0 && d.done === d.goal).length;
  const top = rankHabits(habits, 'goal').slice(0, 10);

  return {
    y, m, days, lastDay, isCurrent, habits, perDay, weeks, top, perfectDays,
    total: {
      done, possible, target,
      pct: pct(done, possible),          // every box in the whole month: the sheet's success rate
      targetPct: pct(done, target),      // raw, as the sheet's "overall daily progress"
      goalMet, goalPct: pct(goalMet, target),
      doneSoFar, daysSoFar, daysPct: pct(doneSoFar, daysSoFar),
    },
  };
}

// The figure one view puts first for a habit or a month total ("both" leads with days).
export const primaryPct = (x, view) => (view === 'goal' ? x.goalPct : x.daysPct);

export function rankHabits(habits, view) {
  return [...habits].sort((a, b) => primaryPct(b, view) - primaryPct(a, view) || b.done - a.done);
}

// Current streak for one habit, walking back across months while the habit exists.
// If today is not ticked yet, the streak still counts up to yesterday: it is alive until midnight.
export function currentStreak(state, id, now) {
  let { y, m } = now;
  let d = now.d;
  const ticked = (yy, mm, dd) => state.months[monthKey(yy, mm)]?.checks[id]?.includes(dd);
  const exists = (yy, mm) => state.months[monthKey(yy, mm)]?.habits.some((h) => h.id === id);
  if (!ticked(y, m, d)) d -= 1;
  let streak = 0;
  for (let guard = 0; guard < 800; guard++) {
    if (d < 1) {
      ({ y, m } = shiftMonth(y, m, -1));
      if (!exists(y, m)) break;
      d = daysIn(y, m);
    }
    if (!ticked(y, m, d)) break;
    streak++;
    d--;
  }
  return streak;
}

// The "Annual Progress Tracker" tab, plus the crane count.
export function yearStats(state, year, now) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const month = state.months[monthKey(year, m)];
    if (!month || !month.habits.length) return { m, rate: null, daysRate: null, goalRate: null, done: 0, possible: 0 };
    const s = monthStats(month, year, m, now);
    const started = s.total.daysSoFar > 0;
    return {
      m,
      daysRate: started ? s.total.daysPct : null,
      goalRate: started ? s.total.goalPct : null,
      rate: started ? s.total.daysPct : null, // the default reading; see rateOf() for a chosen view
      done: s.total.done, possible: s.total.possible, perfectDays: s.perfectDays,
    };
  });
  const cranes = months.reduce((s, x) => s + x.done, 0);
  return { year, months, cranes, ...summarise(months, 'days') };
}

export const rateOf = (mo, view) => (view === 'goal' ? mo.goalRate : mo.daysRate);

// Best month and average for one view.
export function summarise(months, view) {
  const rated = months.filter((x) => rateOf(x, view) !== null);
  const best = rated.reduce((a, b) => (rateOf(b, view) > (a ? rateOf(a, view) : -1) ? b : a), null);
  return { best, bestRate: best ? rateOf(best, view) : null, average: pct(rated.reduce((s, x) => s + rateOf(x, view), 0), rated.length) };
}

export const percent = (x, digits = 0) => `${(x * 100).toFixed(digits)}%`;
