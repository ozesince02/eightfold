// Transcribed from "oze's Habit Tracker v2" (Google Sheets), Jan–Oct 2026.
// Each habit lists the days of the month that were ticked. The ids link the same
// habit across months even when its name changed, so streaks can cross the 1st.
// `start` marks a habit added mid-month (the sheet had no checkbox before it).

export const SEED_YEAR = 2026;

// Paper colours per habit family (see tokens.css for the full palette).
export const HABIT_COLORS = {
  move: '#C8302C',      // shu (vermilion)
  read: '#24496B',      // ai (indigo-blue)
  core: '#8EA46B',      // matcha
  dsa: '#E9B33F',       // yamabuki
  sysdesign: '#C9A57A', // kraft
  java: '#A9CBD6',      // sora
  german: '#E8C3BC',    // sakura
  ovemau: '#6E8C8A',    // aonibi
  soak: '#B98A5E',      // kuri
  protein: '#D98E73',   // akane
};

const h = (id, name, goal, days, extra = {}) => ({ id, name, goal, days, ...extra });
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export const SEED_MONTHS = {
  '2026-01': [
    h('move', '30 mins exercise', 10, [5, 6, 8, 12, 18, 24]),
    h('dsa', '2 DSA questions / PotD', 10, range(5, 31)),
    h('read', '30 mins reading before sleep', 10, [5, 6, 8, 20, 24, 25, 26]),
    h('java', '60 mins Java', 10, [5, 6, 8, 10, 11, 13, 14, 17, 20, 26]),
    h('sysdesign', '60 mins design patterns / DSA theory', 10, [...range(5, 13), ...range(17, 22), 28, 29, 31]),
  ],
  '2026-02': [
    h('move', '30 mins exercise', 20, [5, 14, 15, 16, 18, 19, 20, 28]),
    h('dsa', '2 DSA questions / PotD', 20, range(1, 28)),
    h('read', '30 mins reading before sleep', 20, [6, 7, 15, 26, 28]),
    h('java', '60 mins Java', 20, [3, 4, 5, 7, 8, 13, 14, 15, 21, 26, 28]),
    h('sysdesign', '60 mins design patterns / DSA theory', 20, [1, 2, 3, 8, 12, 23, 26, 27, 28]),
  ],
  '2026-03': [
    h('move', '30 mins exercise', 20, [1, 3, 5, 15, 18, 27]),
    h('dsa', '2 DSA questions / PotD', 30, range(1, 31)),
    h('read', '15 mins reading before sleep', 20, [5, 15, 19, 22, 24, 25, 28, 29, 30, 31]),
    h('java', '60 mins Java', 20, [1, 3, 4, 5, 6, 7, 8, 15, 18, 25]),
    h('sysdesign', '60 mins design patterns / DSA theory', 20, [1, 7, 8, 18, 25, 26]),
    h('ovemau', 'Ove mau', 30, range(1, 31)),
    h('soak', 'Soak dry fruits in water', 10, range(18, 31), { start: 18 }),
    h('protein', 'Protein', 10, range(18, 31), { start: 18 }),
  ],
  '2026-04': [
    h('move', 'Gym', 20, [1, 4, 5, 6, 10, 11, 12, 13, 14, 15, 17, 20, 21, 24]),
    h('dsa', '2 DSA questions / PotD', 20, [...range(10, 21), ...range(24, 27)]),
    h('read', '30 mins reading before sleep', 20, [1, 15, 17, 20]),
    h('java', '60 mins Java', 20, [1, 16, 20, 23, 24, 25, 27]),
    h('sysdesign', '60 mins system design / DSA theory', 20, [12, 20, 23, 25, 27]),
    h('ovemau', 'Ove mau', 30, range(1, 30)),
  ],
  '2026-05': [
    h('move', '30 mins exercise', 20, [1, 7, 10, 11, 12, 13, 15, 16, ...range(18, 31)]),
    h('dsa', '2 DSA questions / PotD', 20, [4, 5, 11, 14, 15, 16, 17, 18, 19]),
    h('read', '30 mins reading before sleep', 20, [1, 5, 7, 8, 15, 17, 26, 27, 28]),
    h('java', '60 mins Java / DSA theory', 20, [17, 18, 25]),
    h('sysdesign', '60 mins system design', 20, [1, 2, 5, 11, 13, 14, 15, 16, 17, 19, 25, 26, 27, 28, 29]),
  ],
  '2026-06': [
    h('move', 'Gym / run', 20, [1, 2, 3, 6, 7, 8, 12, 15, 16, 17, 19, 20, 23, 24, 27, 28]),
    h('read', 'Reading before sleep', 30, [1, 2, 21]),
    h('dsa', 'LeetCode PotD or DSA theory', 20, [1]),
    h('java', '60 mins Java', 20, [20, 21, 27, 28]),
    h('sysdesign', '60 mins system design', 25, [1, 2, 16, ...range(20, 28), 30]),
    h('german', 'Duolingo German', 30, range(1, 30)),
  ],
  '2026-07': [
    h('move', 'Gym / run', 20, [1, 5, 6, 7, 8, 11, 19, 22, 24, 26, 28, 29, 30]),
    h('read', 'Reading before sleep', 20, [1, 12, 13, ...range(22, 28), 31]),
    h('dsa', 'LeetCode PotD or DSA theory', 20, [28, 29]),
    h('java', '60 mins Java / development', 20, range(23, 27)),
    h('sysdesign', '60 mins system design', 20, [12, 13, 15, 16, 19, 22, 23, 24, 25, 26, 28]),
    h('german', 'German', 30, [...range(1, 5), ...range(8, 13), ...range(15, 19), ...range(22, 31)]),
  ],
  '2026-08': [
    h('move', 'Gym / run', 20, [3, 4, 6, 8, 16, 30]),
    h('read', 'Reading before sleep', 20, [1, 2, 3, 6, 7, 8, 20, 30]),
    h('dsa', 'LeetCode PotD or DSA theory', 20, [5, 6, 7, 13]),
    h('java', 'Java / development', 20, [1, 2, 3, 5, 6, 7]),
    h('sysdesign', 'System design / infra', 20, [1, 3, 4, 5, 6, 8, 10, 11, 12, 13, 14, 20]),
    h('german', 'German', 30, [...range(1, 15), 20, 29, 30, 31]),
  ],
  '2026-09': [
    h('move', 'Gym / run', 20, [1, 3, 5, 10, 11, 13, 16, 19, 23, 24, 27, 29, 30], { time: '18:30' }),
    h('read', 'Reading before sleep', 20, [1, 2, 3, 5, 8, 9, 10, 12, 13, 14, 23, 29, 30], { time: '23:00' }),
    h('core', 'Core, lower back and glutes', 20, [...range(1, 7), 9, 10, 11, 13, 16, 18, 19, 21, 22, 24, 27], { time: '07:30' }),
    h('dsa', 'DSA', 20, [1, 2, 3, 5, 8, 12, 13, 22, 23, 28, 29, 30], { time: '21:00' }),
    h('sysdesign', 'System design, AWS, Java and dev', 20, [1, 2, 4, 5, 13], { time: '20:00' }),
    h('german', 'German', 30, [...range(1, 24), ...range(26, 30)], { time: '07:00' }),
  ],
  '2026-10': [
    h('move', 'Gym / run', 20, [2, 3, 5, 11, 12, 13, 15, 16, 18, 19, 20, 21, 22], { time: '18:30' }),
    h('read', 'Reading before sleep', 20, [1, 3, 5, 6, 7, 8, 11, 12, 14, 15, 19, 20], { time: '23:00' }),
    h('core', 'Core, lower back and glutes', 20, [...range(1, 6), 8, 11, 13, 15, 16, 18, 19, 20, 21, 22], { time: '07:30' }),
    h('dsa', 'DSA', 20, [1, 2, 3, ...range(5, 15), 19], { time: '21:00' }),
    h('sysdesign', 'System design, AWS, Java and dev', 20, [5, 11, 12, 15, 19, 20], { time: '20:00' }),
    h('german', 'German', 30, [...range(1, 5), 7, 8, ...range(10, 17), 19, 20, 21], { time: '07:00' }),
  ],
};

// Monthly success rates exactly as the sheet's "Annual Progress Tracker" tab printed them.
// Used only to check the transcription; the app computes its own numbers.
export const SHEET_RATES = { 1: 45, 2: 44, 3: 57, 4: 42, 5: 37, 6: 37, 7: 37, 8: 30, 9: 50, 10: 43 };
