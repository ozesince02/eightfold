// Recomputes each month of oze's transcribed log (src/data/story.js) and compares with the sheet's own totals.
import { SEED_MONTHS, SHEET_RATES } from '../src/data/story.js';
import { monthStats } from '../src/lib/stats.js';
const now = { y: 2026, m: 10, d: 23 };
let total = 0;
for (const [key, habits] of Object.entries(SEED_MONTHS)) {
  const [y, m] = key.split('-').map(Number);
  const month = { habits, checks: Object.fromEntries(habits.map((h) => [h.id, h.days])) };
  const s = monthStats(month, y, m, now);
  total += s.total.done;
  const rate = Math.round(s.total.pct * 100);
  console.log(key, `${s.total.done}/${s.total.possible}`, rate + '%', 'sheet', SHEET_RATES[m] + '%', rate === SHEET_RATES[m] ? 'ok' : 'DIFF',
    m === 10 ? `target ${s.total.done}/${s.total.target} weeks ${s.weeks.map((w) => w.done + '/' + w.possible).join(' ')} longest ${s.habits.map((h) => h.longest).join(',')}` : '');
}
console.log('cranes', total);
