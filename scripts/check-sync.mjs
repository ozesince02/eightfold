// Runs the real sync engine (src/lib/sync/engine.js) against the real schema on Postgres with
// row-level security (D-020): several devices of one person, a second person, offline edits,
// first sign-in choices, more than 1,000 rows, and the "changed" broadcast.
import assert from 'node:assert/strict';
import { supabaseStandIn } from './lib/supabase-stand-in.mjs';
import { createSync } from '../src/lib/sync/engine.js';
import { stateToRows, rowsToState, TABLES } from '../src/lib/sync/rows.js';
import { cleanState } from '../src/lib/sanitize.js';
import { seedState } from '../src/data/seed.js';
import { localAdapter } from '../src/lib/adapters/local.js';

const { db, as, addUser } = await supabaseStandIn();
const OWNER = '00000000-0000-4000-8000-0000000000a1';
const OTHER = '00000000-0000-4000-8000-0000000000b2';
await addUser(OWNER);
await addUser(OTHER);

// ---------- Stand-ins for supabase-js, a device's store and its storage ----------
const buses = new Map(); // topic -> Set of listeners, like a Realtime channel
const pk = (t) => (t === 'profiles' ? ['id'] : ['user_id', ...TABLES[t]]);

function api(uid) {
  const run = async (sql, params) => {
    try { return await as(uid, sql, params); } catch (e) {
      const err = new Error(e.message);
      err.code = e.code || '';
      err.rejected = /^(22|23|42501|P0001)/.test(err.code);
      throw err;
    }
  };
  return {
    // PostgREST's upsert: insert, and on a key clash update the other columns.
    async upsert(table, rows) {
      const cols = Object.keys(rows[0]);
      const keys = pk(table);
      const set = cols.filter((c) => !keys.includes(c)).map((c) => `${c} = excluded.${c}`).join(', ');
      await run(`insert into public.${table} (${cols.join(', ')})
        select ${cols.join(', ')} from jsonb_populate_recordset(null::public.${table}, $1::jsonb)
        on conflict (${keys.join(', ')}) do ${set ? `update set ${set}` : 'nothing'}`, [JSON.stringify(rows)]);
    },
    async remove(table, match, col, values) {
      const where = Object.keys(match).map((c, i) => `${c} = $${i + 3}`);
      await run(`delete from public.${table} where user_id = $1 and ${col}::text = any($2::text[]) ${where.length ? `and ${where.join(' and ')}` : ''}`,
        [uid, values.map(String), ...Object.values(match)]);
    },
    // PostgREST returns JSON, so dates and times arrive as strings, like here.
    async page(table, from, to) {
      const order = TABLES[table].join(', ');
      const res = await run(`select row_to_json(t) as r from public.${table} t where user_id = $1 order by ${order} limit $2 offset $3`, [uid, to - from + 1, from]);
      return res.rows.map((x) => x.r);
    },
    async profile() {
      const res = await run('select prefs from public.profiles where id = $1', [uid]);
      return res.rows[0] || null;
    },
    channel(onChanged) {
      const topic = `user:${uid}`;
      if (!buses.has(topic)) buses.set(topic, new Set());
      buses.get(topic).add(onChanged);
      return {
        notify: () => { for (const fn of buses.get(topic)) if (fn !== onChanged) setTimeout(fn, 0); },
        close: () => buses.get(topic).delete(onChanged),
      };
    },
  };
}

function device(name, initial, saved = { value: {} }) {
  let state = cleanState(initial);
  const listeners = new Set();
  const fire = () => listeners.forEach((fn) => fn(state));
  const aside = [];
  const store = {
    get: () => state,
    subscribe: (fn) => listeners.add(fn),
    replaceState(next) { state = cleanState(next); fire(); },
    keepAsideCopy() { aside.push(JSON.stringify(state)); },
    setSynced() {},
    edit(fn) { fn(state); state = cleanState(state); fire(); },
  };
  let online = true;
  let last = { state: 'off' };
  const messages = [];
  const sync = createSync({
    store,
    storage: { read: () => structuredClone(saved.value), write: (v) => { saved.value = structuredClone(v); } },
    online: () => online,
    onStatus: (s) => { last = s; if (s.message) messages.push(s.message); },
    timers: { setTimeout: () => 0, clearTimeout: () => {} }, // the test flushes and pulls by hand
  });
  return { name, store, sync, saved, aside, messages, status: () => last, goOffline: () => { online = false; }, goOnline: () => { online = true; } };
}

const rowsOf = (state) => Object.fromEntries(Object.entries(stateToRows(state)).map(([k, v]) => [k, v.row]));
const assertSame = (a, b, message) => assert.deepEqual(rowsOf(a.store.get()), rowsOf(b.store.get()), message);
async function accountState(uid) {
  const tables = {};
  for (const t of ['habits', 'months', 'habit_months', 'ticks', 'years']) {
    tables[t] = (await as(uid, `select row_to_json(t) as r from public.${t} t`)).rows.map((x) => x.r);
  }
  tables.profiles = (await as(uid, 'select prefs from public.profiles where id = $1', [uid])).rows;
  return cleanState(rowsToState(tables));
}
const count = async (uid, table) => (await as(uid, `select count(*)::int as n from public.${table}`)).rows[0].n;
const tick = (state, key, id, day) => { const c = state.months[key].checks[id]; if (!c.includes(day)) c.push(day); };

// 1. The owner's browser (the sheet's data) signs in to an empty account: everything is uploaded.
const laptop = device('laptop', seedState());
await laptop.sync.start(api(OWNER), OWNER);
assert.equal(laptop.status().state, 'synced', 'first sign-in uploads and is in step');
const seedTicks = Object.values(seedState().months).reduce((n, m) => n + Object.values(m.checks).reduce((a, d) => a + d.length, 0), 0);
assert.equal(await count(OWNER, 'ticks'), seedTicks, 'every tick reached the account');
assert.deepEqual(rowsOf(await accountState(OWNER)), rowsOf(laptop.store.get()), 'the account matches the browser exactly');

// 2. A new phone signs in: it takes the account's folds.
const phone = device('phone', { version: 1, months: {}, colors: {}, years: {} });
await phone.sync.start(api(OWNER), OWNER);
assertSame(phone, laptop, 'the phone has the same folds');

// 3. Edits on the laptop reach the phone through the broadcast.
laptop.store.edit((s) => {
  tick(s, '2026-10', 'german', 24);
  s.months['2026-10'].habits[0].name = 'Gym, run or swim';
  s.months['2026-10'].checks.read = s.months['2026-10'].checks.read.filter((d) => d !== 1);
  s.years = { 2026: { wish: 'a trip to Kyoto' } };
  s.prefs = { percentView: 'both' };
});
assert.equal(laptop.status().state, 'syncing', 'a change is queued');
await laptop.sync.flush();
await new Promise((r) => setTimeout(r, 50)); // the broadcast makes the phone pull
assertSame(phone, laptop, 'the phone has the laptop\'s edits (rename, tick, untick, wish, prefs)');

// 4. Removing a habit from a month and adding one.
laptop.store.edit((s) => {
  const oct = s.months['2026-10'];
  oct.habits = oct.habits.filter((h) => h.id !== 'core');
  delete oct.checks.core;
  oct.habits.push({ id: 'stretch-ab12', name: 'Stretch', goal: 20, time: '06:45', start: 1, cadence: 'weekdays', weekdays: [1, 3, 5] });
  oct.checks['stretch-ab12'] = [2, 5];
});
await laptop.sync.flush();
await phone.sync.pull();
assertSame(phone, laptop, 'removed and added habits, with schedules, arrive');
assert.equal((await as(OWNER, `select count(*)::int as n from public.ticks where slug = 'core' and month = '2026-10-01'`)).rows[0].n, 0, 'the removed habit\'s ticks are gone from the account');

// 5. Offline: edits are kept and queued, survive a reload, and are sent when back online.
phone.goOffline();
phone.store.edit((s) => { tick(s, '2026-10', 'dsa', 24); });
await phone.sync.flush();
assert.equal(phone.status().state, 'offline', 'offline is reported');
assert.ok(Object.keys(phone.saved.value.ops || {}).length > 0, 'the queue is saved on the device');
const phoneAgain = device('phone after reload', phone.store.get(), phone.saved); // same storage
phoneAgain.goOffline();
await phoneAgain.sync.start(api(OWNER), OWNER);
phoneAgain.goOnline();
await phoneAgain.sync.pull();
assert.ok((await accountState(OWNER)).months['2026-10'].checks.dsa.includes(24), 'the offline tick reached the account after the reload');
assert.equal(Object.keys(phoneAgain.saved.value.ops).length, 0, 'and the queue is empty');

// 6. Both devices offline, ticking different days: both ticks survive.
laptop.goOffline();
phoneAgain.goOffline();
laptop.store.edit((s) => { tick(s, '2026-10', 'sysdesign', 23); });
phoneAgain.store.edit((s) => { tick(s, '2026-10', 'german', 23); });
laptop.goOnline();
phoneAgain.goOnline();
await laptop.sync.pull();
await phoneAgain.sync.pull();
await laptop.sync.pull();
assertSame(laptop, phoneAgain, 'after both sync, both devices agree');
const octTicks = laptop.store.get().months['2026-10'].checks;
assert.ok(octTicks.sysdesign.includes(23) && octTicks.german.includes(23), 'and neither tick was lost');

// 7. First sign-in on a browser that has its own different folds: the person chooses.
const extra = seedState();
extra.months['2025-12'] = { habits: [{ id: 'walk', name: 'Walk', goal: 20, time: '', start: 1 }], checks: { walk: [1, 2, 3] } };
const tablet = device('tablet', extra);
await tablet.sync.start(api(OWNER), OWNER);
assert.equal(tablet.status().state, 'choose', 'two different sets of folds: ask');
await tablet.sync.choose('merge');
const merged = await accountState(OWNER);
assert.deepEqual(merged.months['2025-12'].checks.walk, [1, 2, 3], 'keep both adds the tablet\'s month to the account');
assert.ok(merged.months['2026-10'].checks.german.includes(24), 'and keeps the account\'s ticks');
assertSame(tablet, { store: { get: () => merged } }, 'the tablet matches the account');
assert.equal(tablet.aside.length, 1, 'keep both also keeps the browser’s copy as it was');

const library = device('library', { version: 1, months: { '2026-10': { habits: [{ id: 'x', name: 'Mine', goal: 1, time: '', start: 1 }], checks: { x: [1] } } }, colors: {}, years: {} });
await library.sync.start(api(OWNER), OWNER);
await library.sync.choose('account');
assert.equal(library.aside.length, 1, 'using the account\'s keeps this browser\'s copy aside');
assert.equal(library.store.get().months['2026-10'].habits.some((h) => h.id === 'x'), false, 'and shows the account\'s folds');
assert.equal((await accountState(OWNER)).months['2026-10'].habits.some((h) => h.id === 'x'), false, 'without adding to the account');

// 8. More than 1,000 ticks come back in full (the Data API pages at 1,000 rows).
await new Promise((r) => setTimeout(r, 50)); // the tablet's broadcast reaches the laptop
assert.ok(laptop.store.get().months['2025-12'], "the laptop heard the tablet's change and has the merged month");
laptop.store.edit((s) => {
  for (let m = 1; m <= 12; m++) {
    const key = `2025-${String(m).padStart(2, '0')}`;
    s.months[key] = { habits: s.months['2026-10'].habits.map((h) => ({ ...h })), checks: {} };
    for (const h of s.months[key].habits) s.months[key].checks[h.id] = Array.from({ length: 28 }, (_, i) => i + 1);
  }
});
await laptop.sync.flush();
assert.ok(await count(OWNER, 'ticks') > 2000, 'thousands of ticks in the account');
const newPhone = device('new phone', { version: 1, months: {}, colors: {}, years: {} });
await newPhone.sync.start(api(OWNER), OWNER);
assertSame(newPhone, laptop, 'all of them come back on a new device');

// 9. Another person's devices never see the owner's folds.
const stranger = device('stranger', { version: 1, months: { '2026-10': { habits: [{ id: 'swim', name: 'Swim', goal: 8, time: '', start: 1 }], checks: { swim: [3] } } }, colors: {}, years: {} });
await stranger.sync.start(api(OTHER), OTHER);
assert.deepEqual(Object.keys(stranger.store.get().months), ['2026-10'], 'the stranger sees only their own month');
assert.deepEqual(stranger.store.get().months['2026-10'].habits.map((h) => h.id), ['swim'], 'and only their own habit');
assert.equal((await accountState(OWNER)).months['2026-10'].habits.some((h) => h.id === 'swim'), false, 'and the owner\'s account is untouched');

// 10. Signing out stops syncing and clears the queue; the folds stay on the device.
const before = rowsOf(laptop.store.get());
laptop.sync.stop();
assert.equal(laptop.status().state, 'off');
assert.deepEqual(laptop.saved.value, { lastUser: OWNER }, 'the queue is cleared; the browser remembers whose folds these are');
assert.deepEqual(rowsOf(laptop.store.get()), before, 'the folds stay in this browser');

// 10b. Hearing about the sign-out twice (the menu, then the tracker) keeps the marker, and a
// browser that has just been cleared stays empty: stop() writes nothing there.
laptop.sync.stop();
assert.deepEqual(laptop.saved.value, { lastUser: OWNER }, 'a second stop keeps whose folds these are');
const wiped = device('wiped', { version: 1, months: {}, colors: {}, years: {} }, { value: null });
wiped.sync.stop();
assert.equal(wiped.saved.value, null, 'stopping on a cleared browser writes nothing');

// 11. A shared browser: someone else signs in after the owner signed out. The owner's folds must
// not reach their account, and aren't shown; they're kept aside on the device.
const THIRD = '00000000-0000-4000-8000-0000000000c3';
await addUser(THIRD);
await laptop.sync.start(api(THIRD), THIRD);
assert.equal(await count(THIRD, 'ticks'), 0, 'nothing of the owner’s was uploaded to the new account');
assert.equal(await count(THIRD, 'habit_months'), 0, 'not even a habit');
assert.deepEqual(Object.keys(laptop.store.get().months), [], 'the browser now shows the new account (empty)');
assert.equal(laptop.aside.length, 1, 'the owner’s folds are kept aside, not deleted');

// 12. A queued row the database refuses (here planted in storage) is dropped and reported, and
// doesn't hold up the rest of the queue.
const planted = { value: { user: OWNER, linked: true, ops: {
  'habits|Bad Slug': { op: 'upsert', table: 'habits', row: { slug: 'Bad Slug', color: '#000000' } },
  'years|2031': { op: 'upsert', table: 'years', row: { year: 2031, wish: 'still sent', folded_at: null } },
} } };
const odd = device('odd', await accountState(OWNER), planted);
await odd.sync.start(api(OWNER), OWNER);
assert.ok(odd.messages.some((m) => /1 change couldn.t be saved/.test(m)), 'the refused change is reported');
assert.equal((await accountState(OWNER)).years[2031]?.wish, 'still sent', 'the rest of the queue went through');
assert.deepEqual(odd.saved.value.ops, {}, 'and the queue is empty');

// 13. "Sign out and remove my folds from this browser" removes every Eightfold key, including
// copies kept aside and the old name's data, and nothing that belongs to anyone else.
{
  const items = new Map([
    ['eightfold:v1', '{}'], ['eightfold:v1:sync', '{"lastUser":"x"}'], ['eightfold:v1:unreadable:1', '{}'],
    ['orizuru:v1', '{}'], ['sb-txmseoofjrvsmxyaiwps-auth-token', 'kept for supabase'], ['other-site-thing', '1'],
  ]);
  globalThis.localStorage = {
    get length() { return items.size; },
    key: (i) => [...items.keys()][i] ?? null,
    getItem: (k) => items.get(k) ?? null,
    setItem: (k, v) => items.set(k, String(v)),
    removeItem: (k) => items.delete(k),
  };
  assert.equal(localAdapter.clearAll(), true, 'clearAll reports success');
  assert.deepEqual([...items.keys()].sort(), ['other-site-thing', 'sb-txmseoofjrvsmxyaiwps-auth-token'], "only Eightfold's own keys are removed");
  delete globalThis.localStorage;
}

await db.close();
console.log('sync: all checks pass');
