// Checks how years work (D-017): how far the tracker lets you go, draft months that are saved only
// when edited, one wish per year, and folding a year. Runs the real store on the seed data.
import assert from 'node:assert/strict';
import { store } from '../src/lib/store.js';
import { cleanState } from '../src/lib/sanitize.js';
import { firstMonthKey, lastMonthKey, clampKey, yearBounds, yearToFold, wishOf, foldedAt } from '../src/lib/years.js';

const oct = { y: 2026, m: 10, d: 24 };
const dec = { y: 2026, m: 12, d: 20 };
const jan = { y: 2027, m: 1, d: 3 };
const state = () => store.get();

// Bounds: from the first month with habits to next month.
assert.equal(firstMonthKey(state(), oct), '2026-01', 'nothing before the first month of data');
assert.equal(firstMonthKey({ months: {} }, oct), '2026-10', 'a new tracker starts at this month');
assert.equal(lastMonthKey(oct), '2026-11', 'next month can be set up ahead');
assert.equal(lastMonthKey(dec), '2027-01', 'in December, next January');
assert.equal(clampKey('2019-04', state(), oct), '2026-01', 'too early lands on the first month');
assert.equal(clampKey('2031-05', state(), oct), '2026-11', 'too late lands on next month');
assert.equal(clampKey('2026-07', state(), oct), '2026-07');
assert.deepEqual(yearBounds(state(), dec), { first: 2026, last: 2027 });

// Drafts: looking at a month doesn't save it; changing it does.
const draft = store.view('2026-11');
assert.equal(state().months['2026-11'], undefined, 'viewing November saves nothing');
assert.deepEqual(draft.habits.map((h) => h.id), state().months['2026-10'].habits.map((h) => h.id), 'the draft has October\'s habits');
assert.ok(Object.values(draft.checks).every((d) => d.length === 0), 'and an empty grid');
store.updateHabit('2026-11', draft.habits[0].id, { time: '06:15' });
assert.equal(state().months['2026-11'].habits[0].time, '06:15', 'editing a draft saves the month');

// One wish per year.
store.setWish(2026, '  a trip to Kyoto  ');
assert.equal(wishOf(state(), 2026), 'a trip to Kyoto', 'wish kept for its year, trimmed');
assert.equal(wishOf(state(), 2027), '', 'next year starts without one');
const legacy = cleanState({ version: 1, wish: 'old wish', months: { '2026-03': { habits: [], checks: {} } } });
assert.deepEqual(legacy.years, { 2026: { wish: 'old wish' } }, 'an old single wish moves to its year');
assert.equal('wish' in legacy, false, 'and the old field is gone');
const both = cleanState({ version: 1, wish: 'old', years: { 2026: { wish: 'new' } }, months: { '2026-03': { habits: [], checks: {} } } });
assert.equal(both.years[2026].wish, 'new', 'a per-year wish wins over the old field');

// Folding the year: offered in December and January only, until it's done.
assert.equal(yearToFold(state(), oct), null, 'not in October');
assert.equal(yearToFold(state(), dec), 2026, 'in December');
assert.equal(yearToFold(state(), jan), 2026, 'and in January');

const ids = state().months['2026-11'].habits.map((h) => h.id);
const keep = ids.slice(0, 3);
assert.deepEqual(store.foldYear(2026, { keep, wish: 'run a half marathon' }), []);
const jan27 = state().months['2027-01'];
assert.deepEqual(jan27.habits.map((h) => h.id), keep, 'January has only the habits kept');
assert.ok(jan27.habits.every((h) => h.start === 1), 'starting on the 1st');
assert.equal(wishOf(state(), 2027), 'run a half marathon', 'next year\'s wish is written');
assert.equal(wishOf(state(), 2026), 'a trip to Kyoto', 'this year\'s wish is untouched');
assert.ok(foldedAt(state(), 2026), 'the year is marked folded');
assert.equal(yearToFold(state(), jan), null, 'and no longer offered');

// Folding again with January already ticked: a ticked habit is never dropped.
store.toggle('2027-01', keep[0], 2, true);
assert.deepEqual(store.foldYear(2026, { keep: keep.slice(1), wish: '' }), [jan27.habits[0].name], 'the ticked habit stays and is named');
assert.deepEqual(state().months['2027-01'].habits.map((h) => h.id), keep, 'nothing with ticks was removed');
assert.equal(wishOf(state(), 2027), 'run a half marathon', 'an empty wish leaves the old one');

// Hostile year records.
const evil = cleanState({ version: 1, months: {}, years: { 2026: { wish: 'x'.repeat(999), foldedAt: -5 }, '2026"><b>': { wish: 'no' }, 99999: { wish: 'no' }, 2027: 'nope', 2028: { foldedAt: 1e300 } } });
assert.deepEqual(Object.keys(evil.years), ['2026'], 'only real years with object records survive');
assert.equal(evil.years[2026].wish.length, 200, 'wish capped');
assert.equal(evil.years[2026].foldedAt, undefined, 'bad timestamps dropped');

console.log('years: all checks pass');
