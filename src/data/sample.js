// An example year for the landing page and the checks: made up, not anyone's real habits (D-036).
// Generated once from a seeded random walk so the ticks come in streaks like real ones, then written
// out here as plain data. Each habit lists the days of the month that were ticked; the ids link the
// same habit across months, so streaks can cross the 1st. `start` marks a habit added mid-month.
// Some counts are pinned because scripts/check-stats.mjs and check-reminders.mjs rely on them: see
// the notes above September and October.

export const SAMPLE_YEAR = 2026;
// The landing page tells the example as of this date, so its numbers never drift with the calendar.
export const STORY_DATE = { y: 2026, m: 10, d: 22 };
export const STORY_SPAN = '1 January to 22 October 2026';

// One paper colour per habit (see tokens.css for the palette).
export const SAMPLE_COLORS = {
  bed: '#E8C3BC',     // sakura
  stretch: '#8EA46B', // matcha
  walk: '#C8302C',    // shu
  skill: '#C9A57A',   // kraft
  learn: '#E9B33F',   // yamabuki
  read: '#24496B',    // ai
  water: '#A9CBD6',   // sora
  call: '#6E8C8A',    // aonibi
  fruit: '#D98E73',   // akane
};

const h = (id, name, goal, days, extra = {}) => ({ id, name, goal, days, ...extra });

// September: 90 of 180 boxes (50%); the walk 13 of 30; the bed first by days and by goal, stretching
// second by goal. October, up to the 22nd: 80 of 132 boxes, and nothing yet on the 23rd. Both
// months have a few perfect days (every habit ticked). January:
// "Learn something new" has a goal of 10 and 27 ticks, to show a goal passed (270%).
export const SAMPLE_MONTHS = {
  '2026-01': [
    h('read', 'Read ten pages', 20, [2, 3, 4, 5, 11, 13, 14, 15, 16, 25, 26, 27, 28], { time: '23:00' }),
    h('stretch', 'Stretch for ten minutes', 20, [3, 7, 14, 15, 16, 17, 18, 19, 25, 27, 31], { time: '07:30' }),
    h('learn', 'Learn something new', 10, [1, 2, 4, 5, 6, 7, 8, 9, 11, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31], { time: '21:00' }),
    h('skill', 'Practise a skill', 20, [5, 6, 7, 8, 9, 10, 14, 16, 17, 18, 21, 24, 25, 26, 27], { time: '20:00' }),
    h('bed', 'Make your bed', 30, [1, 2, 3, 8, 9, 10, 11, 12, 14, 19, 20, 21, 23, 27, 29, 30, 31], { time: '07:00' }),
  ],
  '2026-02': [
    h('read', 'Read ten pages', 20, [2, 3, 4, 5, 6, 8, 9, 10, 12, 13, 15, 16, 17, 19, 20, 21, 28], { time: '23:00' }),
    h('stretch', 'Stretch for ten minutes', 20, [3, 4, 5, 6, 9, 10, 14, 15, 18, 19, 20, 22, 23, 24, 25, 26], { time: '07:30' }),
    h('learn', 'Learn something new', 20, [2, 3, 4, 8, 12, 15, 19, 21, 22, 23, 25, 26], { time: '21:00' }),
    h('skill', 'Practise a skill', 20, [1, 2, 3, 4, 14, 15, 16, 20, 21, 23, 25, 26, 28], { time: '20:00' }),
    h('bed', 'Make your bed', 30, [1, 11, 13, 14, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 28], { time: '07:00' }),
    h('water', 'Drink a glass of water', 20, [1, 2, 4, 5, 7, 8, 11, 12, 13, 17, 18, 21, 22, 23, 25, 28]),
  ],
  '2026-03': [
    h('read', 'Read ten pages', 20, [1, 2, 3, 4, 5, 10, 11, 12, 20, 21, 23, 24, 25, 27, 29, 30], { time: '23:00' }),
    h('stretch', 'Stretch for ten minutes', 20, [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 26, 27, 29], { time: '07:30' }),
    h('walk', 'Walk outside', 20, [13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24, 27, 30, 31], { time: '18:30', start: 10 }),
    h('learn', 'Learn something new', 20, [6, 7, 8, 9, 10, 16, 17, 18, 19, 21, 23, 25, 26, 27, 28, 29, 31], { time: '21:00' }),
    h('skill', 'Practise a skill', 20, [2, 3, 4, 7, 8, 11, 16, 18, 21, 22, 26, 27, 28], { time: '20:00' }),
    h('bed', 'Make your bed', 30, [1, 2, 3, 4, 5, 6, 8, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 25, 26, 30, 31], { time: '07:00' }),
    h('water', 'Drink a glass of water', 20, [1, 2, 3, 4, 5, 6, 8, 10, 14, 17, 18, 19, 21, 22, 25, 26, 27]),
  ],
  '2026-04': [
    h('read', 'Read ten pages', 20, [5, 6, 7, 9, 10, 17, 18, 25, 26, 27, 30], { time: '23:00' }),
    h('stretch', 'Stretch for ten minutes', 20, [1, 3, 4, 5, 6, 15, 16, 17, 23, 26, 29, 30], { time: '07:30' }),
    h('walk', 'Walk outside', 20, [2, 3, 4, 6, 8, 9, 10, 12, 13, 18, 19, 20, 21, 23, 25], { time: '18:30' }),
    h('learn', 'Learn something new', 20, [3, 14, 18, 19, 22, 23, 24, 25, 28], { time: '21:00' }),
    h('skill', 'Practise a skill', 20, [1, 7, 12, 17, 19, 20, 26, 28, 30], { time: '20:00' }),
    h('bed', 'Make your bed', 30, [8, 9, 12, 13, 15, 17, 19, 21, 27], { time: '07:00' }),
    h('water', 'Drink a glass of water', 20, [1, 3, 8, 9, 12, 14, 22, 27, 28, 29]),
  ],
  '2026-05': [
    h('read', 'Read ten pages', 20, [2, 12, 13, 14, 16, 21, 22, 23, 24, 28, 30, 31], { time: '23:00' }),
    h('stretch', 'Stretch for ten minutes', 20, [1, 3, 5, 6, 7, 8, 9, 12, 14, 15, 16, 21, 22], { time: '07:30' }),
    h('walk', 'Walk outside', 20, [2, 3, 10, 11, 15, 16, 18, 22, 23, 24, 25, 26, 27], { time: '18:30' }),
    h('learn', 'Learn something new', 20, [4, 10, 11, 15, 16, 17, 19, 21, 22, 26], { time: '21:00' }),
    h('skill', 'Practise a skill', 20, [2, 3, 4, 5, 9, 15, 17, 19, 21, 25, 26, 27, 31], { time: '20:00' }),
    h('bed', 'Make your bed', 30, [2, 10, 11, 18, 19, 21, 22, 24, 30], { time: '07:00' }),
  ],
  '2026-06': [
    h('read', 'Read ten pages', 20, [4, 6, 7, 8, 13, 14, 15, 16, 17, 20, 21], { time: '23:00' }),
    h('stretch', 'Stretch for ten minutes', 20, [1, 2, 4, 10, 11, 14, 16, 21, 24, 26, 29, 30], { time: '07:30' }),
    h('walk', 'Walk outside', 20, [8, 12, 13, 15, 16, 18, 20, 21, 23, 29, 30], { time: '18:30' }),
    h('learn', 'Learn something new', 20, [5, 16, 17, 19, 21, 22, 23, 26, 27, 28], { time: '21:00' }),
    h('skill', 'Practise a skill', 20, [1, 2, 7, 8, 9, 10, 11, 12, 13, 14, 20, 22, 28, 29], { time: '20:00' }),
    h('bed', 'Make your bed', 30, [1, 7, 13, 14, 15, 16, 17, 20, 21, 25, 26, 27, 28, 29], { time: '07:00' }),
    h('call', 'Call someone you love', 10, [2, 5, 6, 7, 13, 14, 15, 23, 24, 25, 27, 28, 29, 30]),
  ],
  '2026-07': [
    h('read', 'Read ten pages', 20, [5, 8, 11, 12, 17, 18, 20, 21, 22, 25, 26, 28], { time: '23:00' }),
    h('stretch', 'Stretch for ten minutes', 20, [4, 5, 6, 15, 16, 17, 18, 22, 23, 25, 29, 30], { time: '07:30' }),
    h('walk', 'Walk outside', 20, [1, 3, 4, 10, 12, 14, 17, 21, 22, 23, 29, 31], { time: '18:30' }),
    h('learn', 'Learn something new', 20, [3, 4, 8, 9, 10, 15, 16, 24, 25, 27, 29], { time: '21:00' }),
    h('skill', 'Practise a skill', 20, [2, 4, 5, 8, 13, 14, 20, 21, 22, 31], { time: '20:00' }),
    h('bed', 'Make your bed', 30, [9, 10, 13, 21, 26, 27, 28, 29], { time: '07:00' }),
    h('call', 'Call someone you love', 10, [1, 6, 8, 9, 10, 11, 12, 13, 14, 23, 25, 26, 29, 31]),
  ],
  '2026-08': [
    h('read', 'Read ten pages', 20, [1, 3, 4, 8, 9, 11, 15, 17, 18, 21, 22, 25, 28], { time: '23:00' }),
    h('stretch', 'Stretch for ten minutes', 20, [3, 4, 7, 8, 11, 12, 13, 14, 16, 18, 23, 25, 26], { time: '07:30' }),
    h('walk', 'Walk outside', 20, [2, 4, 7, 9, 20, 21, 22, 24, 29], { time: '18:30' }),
    h('learn', 'Learn something new', 20, [1, 3, 6, 7, 8, 10, 11, 12, 16, 18, 22, 26, 31], { time: '21:00' }),
    h('skill', 'Practise a skill', 20, [2, 3, 4, 5, 8, 12, 14, 20, 21, 23], { time: '20:00' }),
    h('bed', 'Make your bed', 30, [1, 9, 10, 11, 13, 14, 19], { time: '07:00' }),
    h('call', 'Call someone you love', 10, [2, 5, 9, 11, 14, 17, 24, 25]),
    h('fruit', 'Eat a piece of fruit', 10, [18, 19, 20, 23, 24], { start: 18 }),
  ],
  '2026-09': [
    h('bed', 'Make your bed', 30, [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29], { time: '07:00' }),
    h('stretch', 'Stretch for ten minutes', 20, [2, 3, 4, 5, 6, 7, 8, 9, 13, 14, 16, 20, 21, 22, 23, 27, 29], { time: '07:30' }),
    h('walk', 'Walk outside', 20, [1, 9, 10, 11, 12, 17, 18, 19, 20, 21, 23, 26, 27], { time: '18:30' }),
    h('skill', 'Practise a skill', 20, [9, 14, 21, 23, 24, 26, 27], { time: '20:00' }),
    h('learn', 'Learn something new', 20, [1, 4, 5, 6, 7, 9, 18, 21, 25, 26, 27, 28, 29, 30], { time: '21:00' }),
    h('read', 'Read ten pages', 20, [6, 9, 12, 13, 16, 18, 20, 21, 25, 27, 29, 30], { time: '23:00' }),
  ],
  '2026-10': [
    h('walk', 'Walk outside', 20, [1, 3, 6, 9, 11, 13, 14, 15, 16, 17, 20, 21, 22], { time: '18:30' }),
    h('read', 'Read ten pages', 20, [1, 2, 4, 5, 6, 7, 11, 12, 15, 19, 20, 21], { time: '23:00' }),
    h('stretch', 'Stretch for ten minutes', 20, [2, 3, 4, 5, 6, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21], { time: '07:30' }),
    h('learn', 'Learn something new', 20, [1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 15, 17, 20, 21], { time: '21:00' }),
    h('skill', 'Practise a skill', 20, [2, 6, 9, 15, 16, 20], { time: '20:00' }),
    h('bed', 'Make your bed', 30, [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 18, 19, 20, 21, 22], { time: '07:00' }),
  ],
};

// The example as a tracker state. The tracker itself starts empty for everyone (D-016).
export function sampleState() {
  const months = {};
  for (const [key, habits] of Object.entries(SAMPLE_MONTHS)) {
    months[key] = {
      habits: habits.map(({ id, name, goal, time, start }) => ({ id, name, goal, time: time || '', start: start || 1 })),
      checks: Object.fromEntries(habits.map((x) => [x.id, [...x.days]])),
    };
  }
  return { version: 1, colors: { ...SAMPLE_COLORS }, months, years: {} };
}
