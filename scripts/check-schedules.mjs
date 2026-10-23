// Habit schedules (D-013), checked against hand-counted October 2026 (the 1st is a Thursday).
// Today is Friday 23 October.
import assert from 'node:assert/strict';
import { monthStats, streakOf } from '../src/lib/stats.js';
import { defaultGoal, habitWeeks, isoWeekday, describe } from '../src/lib/schedule.js';
import { dueReminders } from '../src/lib/reminders-core.js';

const now = { y: 2026, m: 10, d: 23 };
const at = (d, h = 21, min = 0) => new Date(2026, 9, d, h, min);
const habit = (id, extra) => ({ id, name: id, goal: 0, time: '21:00', start: 1, ...extra });
const stateOf = (months) => ({ months, reminders: { enabled: true, lead: 0, off: {}, log: {} } });
const oct = (habits, checks) => ({ habits, checks });
const statsFor = (h, ticks) => monthStats(oct([h], { [h.id]: ticks }), 2026, 10, now).habits[0];
const ids = (list) => list.map((x) => x.habit.id).join(',');

assert.equal(isoWeekday(2026, 10, 1), 4, '1 October 2026 is a Thursday');

// ---- On chosen days: Monday and Wednesday -------------------------------------------------
const mw = habit('mw', { cadence: 'weekdays', weekdays: [1, 3] });
assert.equal(defaultGoal(mw, 2026, 10), 8, 'Mondays 5 12 19 26 and Wednesdays 7 14 21 28');
assert.equal(describe(mw), 'Mon, Wed');
let s = statsFor({ ...mw, goal: 8 }, [5, 7, 12, 19]);
assert.equal(s.due[5], 'rest', 'Tuesday the 6th is a rest day, not a miss');
assert.equal(s.due[6], 'due', 'Wednesday the 7th is due');
assert.equal(`${s.doneSoFar}/${s.daysSoFar}`, '4/6', 'due so far: 5 7 12 14 19 21');
assert.equal(s.credit, 4);
s = statsFor({ ...mw, goal: 8 }, [5, 7, 12, 14, 19, 21]);
assert.equal(s.longest, 6, 'rest days don\'t break a run');
assert.deepEqual(streakOf(stateOf({ '2026-10': oct([mw], { mw: [5, 7, 12, 14, 19, 21] }) }), 'mw', now), { n: 6, unit: 'day' });
assert.equal(streakOf(stateOf({ '2026-10': oct([mw], { mw: [5, 7, 12, 14, 19] }) }), 'mw', now).n, 0, 'missed Wednesday the 21st');

// ---- Three times a week ---------------------------------------------------------------------
const tpw = habit('tpw', { cadence: 'times_per_week', timesPerWeek: 3 });
assert.deepEqual(habitWeeks(tpw, 2026, 10).map((w) => w.target), [3, 3, 3, 3, 1], 'the 29th–31st asks for 1');
assert.equal(defaultGoal(tpw, 2026, 10), 13);
s = statsFor({ ...tpw, goal: 13 }, [1, 2, 3, 8, 9, 15, 16, 17, 22]);
assert.equal(s.due.every((k) => k === 'flex'), true, 'any day counts');
assert.equal(`${s.doneSoFar}/${s.daysSoFar}`, '9/10', 'weeks 1–3 due in full (9), this week only counts what\'s done (1)');
assert.equal(s.credit, 9);
assert.equal(s.unit, 'week');
assert.deepEqual(streakOf(stateOf({ '2026-10': oct([tpw], { tpw: [1, 2, 3, 8, 9, 15, 16, 17, 22] }) }), 'tpw', now), { n: 1, unit: 'week' }, 'week 3 met, week 2 short');
s = statsFor({ ...tpw, goal: 13 }, [1, 2, 3, 4, 5]);
assert.equal(s.credit, 3, 'extra ticks in a week don\'t count past its target');

// ---- Once a week and once a month ------------------------------------------------------------
const wk = habit('wk', { cadence: 'weekly' });
s = statsFor({ ...wk, goal: 5 }, [3, 20]);
assert.equal(`${s.doneSoFar}/${s.daysSoFar}`, '2/3', 'weeks 1, 2, 3 are over; week 4 is still open');
const mo = habit('mo', { cadence: 'monthly' });
s = statsFor({ ...mo, goal: 1 }, []);
assert.equal(s.daysSoFar, 0, 'this month is still open: not a miss yet');
const moMonths = { '2026-08': oct([mo], { mo: [3] }), '2026-09': oct([mo], { mo: [10] }), '2026-10': oct([mo], { mo: [] }) };
assert.deepEqual(streakOf(stateOf(moMonths), 'mo', now), { n: 2, unit: 'month' }, 'August and September done; October still open');

// ---- A day's score only counts what was due that day ----------------------------------------
const daily = habit('daily', {});
const month = monthStats(oct([daily, mw, wk], { daily: [6], mw: [], wk: [6] }), 2026, 10, now);
assert.equal(`${month.perDay[5].done}/${month.perDay[5].goal}`, '2/2', 'Tuesday the 6th: daily + the weekly tick; the Mon/Wed habit rests');
assert.equal(`${month.perDay[6].done}/${month.perDay[6].goal}`, '0/2', 'Wednesday the 7th: daily + Mon/Wed are due; weekly not ticked so not counted');

// ---- Reminders follow the schedule -----------------------------------------------------------
const remindState = (checks) => stateOf({ '2026-10': oct([mw, tpw, wk, mo], checks) });
assert.equal(ids(dueReminders(remindState({}), at(21, 21))), 'mw,tpw,wk,mo', 'Wednesday the 21st: everything is due');
assert.equal(ids(dueReminders(remindState({}), at(23, 21))), 'tpw,wk,mo', 'Friday the 23rd: the Mon/Wed habit rests');
assert.equal(ids(dueReminders(remindState({ tpw: [19, 22], wk: [22], mo: [2] }), at(23, 21))), 'tpw',
  'this week the 3-a-week habit has 1 tick so still due; weekly done this week; monthly done this month');
assert.equal(ids(dueReminders(remindState({ tpw: [22, 24, 25] }), at(23, 21))), 'wk,mo', '3-a-week already has 3 this week (incl. ticks ahead)');

console.log('schedules: all checks pass');
