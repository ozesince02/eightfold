// Checks when reminders fire, against the seeded October data (23 October has no ticks yet).
import assert from 'node:assert/strict';
import { SEED_MONTHS } from '../src/data/seed.js';
import { dueReminders, nextReminder, logKey, upcomingReminders, pushText } from '../src/lib/reminders-core.js';
import { wallClock } from '../src/lib/dates.js';

const months = { '2026-10': { habits: SEED_MONTHS['2026-10'], checks: Object.fromEntries(SEED_MONTHS['2026-10'].map((h) => [h.id, [...h.days]])) } };
const state = (reminders) => ({ months: structuredClone(months), reminders });
const at = (h, m) => new Date(2026, 9, 23, h, m);
const ids = (list) => list.map((x) => x.habit.id).join(',');

assert.equal(ids(dueReminders(state({ enabled: false }), at(7, 0))), '', 'off means nothing fires');
assert.equal(ids(dueReminders(state({ enabled: true }), at(6, 59))), '', 'nothing before 07:00');
assert.equal(ids(dueReminders(state({ enabled: true }), at(7, 0))), 'german', 'German at 07:00');
assert.equal(ids(dueReminders(state({ enabled: true }), at(7, 40))), 'german,core', 'both morning habits by 07:40');
assert.equal(dueReminders(state({ enabled: true }), at(7, 40))[0].late, true, 'German is late at 07:40');
assert.equal(ids(dueReminders(state({ enabled: true }), at(9, 31))), '', 'gone after the two-hour window');
assert.equal(ids(dueReminders(state({ enabled: true, lead: 10 }), at(20, 50))), 'sysdesign,dsa', 'DSA 10 minutes early at 20:50');
assert.equal(ids(dueReminders(state({ enabled: true, off: { dsa: true } }), at(21, 0))), 'sysdesign', 'switched-off habit stays quiet');

const fired = state({ enabled: true, log: { [logKey(at(7, 0), 'german')]: { firedAt: 1 } } });
assert.equal(ids(dueReminders(fired, at(7, 5))), '', 'fires once');
const snoozed = state({ enabled: true, log: { [logKey(at(7, 0), 'german')]: { firedAt: 1, snoozeUntil: at(7, 10).getTime() } } });
assert.equal(ids(dueReminders(snoozed, at(7, 9))), '', 'snoozed until 07:10');
assert.equal(ids(dueReminders(snoozed, at(7, 10))), 'german', 'back at 07:10');

const ticked = state({ enabled: true });
ticked.months['2026-10'].checks.german.push(23);
assert.equal(ids(dueReminders(ticked, at(7, 0))), '', 'already done today: no nudge');
assert.equal(nextReminder(state({ enabled: true }), at(12, 0)).habit.id, 'move', 'next after noon is the gym at 18:30');

// Closed-app reminders (D-028): each half-hour run covers (slot, slot + 30].
const soon = (h, m, off) => upcomingReminders(state({ enabled: false }), at(h, m), off).map((x) => x.id).join(',');
assert.equal(soon(6, 30), 'german', 'the 06:30 run reminds German at 07:00, half an hour early');
assert.equal(soon(7, 0), 'core', 'the 07:00 run covers 07:01 to 07:30, not German again');
assert.equal(soon(6, 47), 'german', 'a run that starts late still covers its own half hour');
assert.equal(soon(6, 30, { german: true }), '', 'a habit switched off stays quiet');
assert.equal(soon(19, 30), 'sysdesign', 'System design at 20:00 from the 19:30 run');
assert.equal(soon(20, 30), 'dsa', 'DSA at 21:00 from the 20:30 run');
assert.equal(soon(22, 30), 'read', 'Reading at 23:00 from the 22:30 run');
assert.equal(upcomingReminders(ticked, at(6, 30)).length, 0, 'already done today: no push');
const midnight = state({ enabled: false });
midnight.months['2026-10'].habits.find((h) => h.id === 'german').time = '00:00';
assert.equal(upcomingReminders(midnight, at(0, 0)).map((x) => x.id).join(','), 'german', 'a habit at 00:00 belongs to the 00:00 run');
assert.equal(upcomingReminders(midnight, at(23, 30)).map((x) => x.id).join(','), '', 'and not to the evening before');
assert.deepEqual(pushText({ name: 'German', time: '07:00' }), { title: 'German · 07:00', body: 'Next up: German at 07:00.' });
assert.match(pushText({ name: 'Gym', time: '18:30', cadence: 'times_per_week', timesPerWeek: 3 }).body, /Any day this week counts/);

// The sender runs in UTC; people live in their own time zones.
const instant = new Date(Date.UTC(2026, 9, 28, 1, 30)); // 01:30 UTC
const kolkata = wallClock(instant, 'Asia/Kolkata');
assert.deepEqual([kolkata.getDate(), kolkata.getHours(), kolkata.getMinutes()], [28, 7, 0], '01:30 UTC is 07:00 in Kolkata');
const la = wallClock(instant, 'America/Los_Angeles');
assert.deepEqual([la.getDate(), la.getHours(), la.getMinutes()], [27, 18, 30], 'and 18:30 the evening before in Los Angeles');
assert.throws(() => wallClock(instant, 'Not/A_Zone'), RangeError, 'an unknown zone is refused, not guessed');
console.log('reminders: all checks pass');
