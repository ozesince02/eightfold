// Checks when reminders fire, against the seeded October data (23 October has no ticks yet).
import assert from 'node:assert/strict';
import { SEED_MONTHS } from '../src/data/seed.js';
import { dueReminders, nextReminder, logKey } from '../src/lib/reminders-core.js';

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
console.log('reminders: all checks pass');
