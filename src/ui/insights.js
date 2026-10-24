// Facts the landing page and the tracker both quote, computed from the store.
import { monthKey, daysIn, shiftMonth, monthName } from '../lib/dates.js';
import { monthStats } from '../lib/stats.js';

// The month worth showing: this one once it has a week of data, otherwise the last one.
export function featuredMonth(state, now) {
  let { y, m } = now;
  if (now.d < 7 || !state.months[monthKey(y, m)]) ({ y, m } = shiftMonth(y, m, -1));
  const month = state.months[monthKey(y, m)];
  return { y, m, month, stats: monthStats(month, y, m, now) };
}

// The longest run of ticked days in a row in the year, for the look back when folding it.
export const longestRun = (state, year, now) => bestRun(state, year, now, () => true);

function bestRun(state, year, now, accept) {
  let best = null;
  const ids = new Set();
  Object.entries(state.months).forEach(([key, mo]) => { if (key.startsWith(String(year))) mo.habits.forEach((h) => ids.add(h.id)); });
  for (const id of ids) {
    let run = [];
    const finish = () => {
      const months = new Set(run.map((r) => r.m));
      if (accept(months) && (!best || run.length > best.length)) {
        const parts = [...months].map((mm) => run.filter((r) => r.m === mm).length);
        const name = state.months[monthKey(year, run[run.length - 1].m)].habits.find((h) => h.id === id)?.name || id;
        best = { id, name, length: run.length, from: run[0], to: run[run.length - 1], parts };
      }
      run = [];
    };
    for (let m = 1; m <= 12; m++) {
      const mo = state.months[monthKey(year, m)];
      const last = year === now.y && m === now.m ? now.d : daysIn(year, m);
      if (year === now.y && m > now.m) break;
      const has = mo?.habits.some((h) => h.id === id);
      for (let d = 1; d <= last; d++) {
        if (has && mo.checks[id]?.includes(d)) run.push({ m, d });
        else if (run.length) finish();
      }
    }
    if (run.length) finish();
  }
  return best;
}

export const dateLabel = ({ m, d }) => `${d} ${monthName(m)}`;

export function daysLeftInYear(now) {
  const end = new Date(now.y, 11, 31);
  const start = new Date(now.y, now.m - 1, now.d);
  return Math.round((end - start) / 86400000) + 1;
}
