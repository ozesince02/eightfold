// Small date helpers. Months are 1-based everywhere in One More Fold ("2026-10" is October).

export const pad = (n) => String(n).padStart(2, '0');
export const monthKey = (y, m) => `${y}-${pad(m)}`;
export const parseKey = (key) => {
  const [y, m] = key.split('-').map(Number);
  return { y, m };
};
export const daysIn = (y, m) => new Date(y, m, 0).getDate();
export const weekday = (y, m, d) => new Date(y, m - 1, d).getDay(); // 0 = Sunday

const fmt = (opts) => new Intl.DateTimeFormat('en-GB', opts);
export const monthName = (m) => fmt({ month: 'long' }).format(new Date(2026, m - 1, 1));
export const monthShort = (m) => fmt({ month: 'short' }).format(new Date(2026, m - 1, 1));
export const dayShort = (y, m, d) => fmt({ weekday: 'short' }).format(new Date(y, m - 1, d));
export const dayLong = (y, m, d) => fmt({ weekday: 'long' }).format(new Date(y, m - 1, d));

export const shiftMonth = (y, m, delta) => {
  const d = new Date(y, m - 1 + delta, 1);
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
};

export function today() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}

// The sheet splits a month into five weeks counted from the 1st, not calendar weeks.
export function sheetWeeks(days) {
  const weeks = [];
  for (let from = 1, i = 1; from <= days; from += 7, i++) {
    weeks.push({ index: i, from, to: Math.min(from + 6, days) });
  }
  return weeks;
}

// "07:00" -> minutes after midnight, for ordering the day.
export const minutesOf = (time) => {
  if (!time) return 24 * 60;
  const [h, mm] = time.split(':').map(Number);
  return h * 60 + (mm || 0);
};

// The time on someone's wall clock, as a Date whose local fields (getHours, getDate...) read it.
// For the closed-app sender (D-028), which runs in UTC but reminds people in their own time zone.
// An unknown zone name throws a RangeError; the caller falls back to UTC.
export function wallClock(instant, timeZone) {
  const parts = {};
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
  for (const p of fmt.formatToParts(instant)) parts[p.type] = Number(p.value);
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
}
