// Checks the two percentage readings (days so far, and goal) against hand-counted cases.
import assert from 'node:assert/strict';
import { SEED_MONTHS } from '../src/data/seed.js';
import { monthStats, rankHabits, yearStats } from '../src/lib/stats.js';

const month = (key) => ({ habits: SEED_MONTHS[key], checks: Object.fromEntries(SEED_MONTHS[key].map((h) => [h.id, [...h.days]])) });
const now = { y: 2026, m: 10, d: 23 };
const round = (x) => Math.round(x * 100);

// September is over: days so far = all 30 days.
const sep = monthStats(month('2026-09'), 2026, 9, now);
const gym = sep.habits.find((h) => h.id === 'move');
assert.equal(`${gym.doneSoFar}/${gym.daysSoFar}`, '13/30', 'September gym: 13 of 30 days');
assert.equal(round(gym.daysPct), 43, 'September gym: 43% of days');
assert.equal(round(gym.goalPct), 65, 'September gym: 65% of its 20-day goal');

// October on the 23rd, nothing ticked today: today does not count as a miss yet.
const oct = monthStats(month('2026-10'), 2026, 10, now);
const octGym = oct.habits.find((h) => h.id === 'move');
assert.equal(octGym.daysSoFar, 22, 'unticked today is left out');
const ticked = month('2026-10');
ticked.checks.move.push(23);
assert.equal(monthStats(ticked, 2026, 10, now).habits.find((h) => h.id === 'move').daysSoFar, 23, 'ticked today counts');
assert.equal(`${oct.total.doneSoFar}/${oct.total.daysSoFar}`, '80/132', 'October so far: 80 of 132 boxes');

// January DSA went 27 against a goal of 10: shown as 270%, but capped at 10 in the month's goal total.
const jan = monthStats(month('2026-01'), 2026, 1, now);
assert.equal(round(jan.habits.find((h) => h.id === 'dsa').goalPct), 270);
assert.ok(jan.total.goalPct <= 1, 'month goal total never passes 100%');

// Ranking follows the chosen view.
assert.equal(rankHabits(sep.habits, 'days')[0].id, 'german');
assert.equal(rankHabits(sep.habits, 'goal')[0].id, 'german');
assert.equal(rankHabits(sep.habits, 'goal')[1].id, 'core');

// The year: past months match the sheet's success rate; October is counted so far.
const year = yearStats({ months: Object.fromEntries(Object.keys(SEED_MONTHS).map((k) => [k, month(k)])) }, 2026, now);
assert.equal(round(year.months[8].daysRate), 50, 'September 50%, as in the sheet');
assert.equal(round(year.months[9].daysRate), 61, 'October so far 61% (the sheet showed 43% by counting days 24 to 31 as misses)');
assert.equal(year.months[10].daysRate, null, 'November not started');
console.log('stats: all checks pass');
