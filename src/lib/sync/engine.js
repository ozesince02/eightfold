// Sync between this browser and the person's account (D-020). Local-first: every change is saved
// on the device at once, turned into row changes, queued, and sent within a second when online.
// Other devices hear a "changed" broadcast and fetch the person's rows. The screen never waits.
//
// The engine talks to the database only through `api` (supabaseApi below in the browser, a
// Postgres-backed stand-in in scripts/check-sync.mjs), so the same code is tested end to end.
import { stateToRows, rowsToState, diffRows, hasData, mergeStates, TABLES, UPSERT_ORDER, DELETE_ORDER } from './rows.js';
import { cleanState } from '../sanitize.js';
import { STORE_KEY } from '../../config.js';

export const SYNC_KEY = `${STORE_KEY}:sync`; // { user, linked, ops }: survives reloads and going offline
const PAGE = 1000; // the Data API returns at most 1,000 rows per request
const CHUNK = 500;
const FLUSH_DELAY = 500;
const PULL_EVERY = 5 * 60 * 1000;
const READ_TABLES = ['habits', 'months', 'habit_months', 'ticks', 'years'];

const sameRows = (a, b) => JSON.stringify(Object.keys(a).sort().map((k) => [k, a[k].row])) === JSON.stringify(Object.keys(b).sort().map((k) => [k, b[k].row]));

// ---------- The database, through supabase-js ----------
class SyncError extends Error {
  constructor(error) {
    super(error?.message || 'sync failed');
    this.code = error?.code || '';
    // Refused by the database (bad data, a limit, a policy): retrying won't help.
    this.rejected = /^(22|23|42501|P0001)/.test(this.code);
  }
}

export function supabaseApi(sb, uid) {
  const check = ({ data, error }) => { if (error) throw new SyncError(error); return data; };
  return {
    async upsert(table, rows) {
      const onConflict = table === 'profiles' ? 'id' : ['user_id', ...TABLES[table]].join(',');
      check(await sb.from(table).upsert(rows, { onConflict }));
    },
    async remove(table, match, col, values) {
      let q = sb.from(table).delete().eq('user_id', uid);
      for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
      check(await q.in(col, values));
    },
    async page(table, from, to) {
      let q = sb.from(table).select('*').eq('user_id', uid);
      for (const c of TABLES[table]) q = q.order(c);
      return check(await q.range(from, to));
    },
    async profile() {
      return check(await sb.from('profiles').select('prefs').eq('id', uid).maybeSingle());
    },
    channel(onChanged) {
      const ch = sb.channel(`user:${uid}`, { config: { private: true, broadcast: { self: false } } });
      ch.on('broadcast', { event: 'changed' }, onChanged);
      Promise.resolve(sb.realtime.setAuth?.()).then(() => ch.subscribe());
      return {
        notify: () => ch.send({ type: 'broadcast', event: 'changed', payload: {} }).catch(() => {}),
        close: () => sb.removeChannel(ch),
      };
    },
  };
}

// ---------- The engine ----------
// store: the app's store (get, subscribe, replaceState, keepAsideCopy, setSynced).
// storage: { read(), write(obj) } for the queue. onStatus({ state, pending, message }) where state is
// 'off' | 'syncing' | 'synced' | 'offline' | 'error' | 'choose'.
export function createSync({ store, storage, onStatus = () => {}, online = () => true, timers = globalThis }) {
  let api = null;
  let uid = null;
  let linked = false;
  let ops = {};
  let base = null; // rows the account has, plus what's queued: diffs are taken against this
  let remoteForChoice = null;
  let applying = false;
  let channel = null;
  let flushing = null;
  let pulling = null;
  let flushTimer = null;
  let retryTimer = null;
  let retryDelay = 5000;
  let status = { state: 'off', pending: 0 };

  const setStatus = (state, message) => {
    status = { state, pending: Object.keys(ops).length, ...(message ? { message } : {}) };
    store.setSynced(linked && (state === 'synced' || state === 'syncing'));
    onStatus(status);
  };
  const persist = () => storage.write(uid ? { user: uid, linked, ops } : {});

  // Every local save: what changed since `base` joins the queue.
  store.subscribe((state) => {
    if (!linked) return;
    const rows = stateToRows(state);
    if (applying) { base = rows; return; }
    const next = diffRows(base, rows);
    if (!Object.keys(next).length) return;
    Object.assign(ops, next);
    base = rows;
    persist();
    setStatus(online() ? 'syncing' : 'offline');
    scheduleFlush();
  });

  function applyRemote(state) {
    applying = true;
    try { store.replaceState(state); } finally { applying = false; }
  }

  function scheduleFlush(delay = FLUSH_DELAY) {
    timers.clearTimeout(flushTimer);
    flushTimer = timers.setTimeout(() => { flush().catch(() => {}); }, delay);
  }

  function scheduleRetry() {
    timers.clearTimeout(retryTimer);
    retryTimer = timers.setTimeout(() => { retryTimer = null; sync().catch(() => {}); }, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 60000);
  }

  // Sends the queue, parents before children for upserts and children first for deletes. An op is
  // removed only once sent, and only if no newer change to the same row arrived meanwhile.
  async function flush() {
    if (flushing) return flushing;
    flushing = (async () => {
      if (!linked || !Object.keys(ops).length) return true;
      if (!online()) { setStatus('offline'); return false; }
      setStatus('syncing');
      let dropped = 0;
      const done = (entries) => { for (const [k, o] of entries) if (ops[k] === o) delete ops[k]; persist(); };
      try {
        for (const table of UPSERT_ORDER) {
          const items = Object.entries(ops).filter(([, o]) => o.op === 'upsert' && o.table === table);
          for (let i = 0; i < items.length; i += CHUNK) {
            const chunk = items.slice(i, i + CHUNK);
            const rows = chunk.map(([, o]) => (table === 'profiles' ? { id: uid, ...o.row } : { user_id: uid, ...o.row }));
            try {
              await api.upsert(table, rows);
            } catch (err) {
              if (!err.rejected) throw err;
              // One bad row mustn't hold up the rest: send one by one and drop what's refused.
              for (let j = 0; j < chunk.length; j++) {
                try { await api.upsert(table, [rows[j]]); } catch (e) { if (!e.rejected) throw e; dropped++; }
              }
            }
            done(chunk);
          }
        }
        for (const table of DELETE_ORDER) {
          const items = Object.entries(ops).filter(([, o]) => o.op === 'delete' && o.table === table);
          const cols = TABLES[table];
          const last = cols[cols.length - 1];
          const groups = new Map();
          for (const entry of items) {
            const match = Object.fromEntries(cols.slice(0, -1).map((c) => [c, entry[1].row[c]]));
            const g = JSON.stringify(match);
            if (!groups.has(g)) groups.set(g, { match, entries: [] });
            groups.get(g).entries.push(entry);
          }
          for (const { match, entries } of groups.values()) {
            for (let i = 0; i < entries.length; i += CHUNK) {
              const chunk = entries.slice(i, i + CHUNK);
              await api.remove(table, match, last, chunk.map(([, o]) => o.row[last]));
              done(chunk);
            }
          }
        }
        channel?.notify();
        retryDelay = 5000;
        setStatus(Object.keys(ops).length ? 'syncing' : 'synced', dropped ? `${dropped} change${dropped === 1 ? '' : 's'} couldn't be saved to your account.` : undefined);
        if (Object.keys(ops).length) scheduleFlush();
        return true;
      } catch {
        setStatus(online() ? 'error' : 'offline');
        scheduleRetry();
        return false;
      }
    })();
    try { return await flushing; } finally { flushing = null; }
  }

  async function fetchAccount() {
    const tables = {};
    for (const t of READ_TABLES) {
      const rows = [];
      for (let from = 0; ; from += PAGE) {
        const page = await api.page(t, from, from + PAGE - 1);
        rows.push(...page);
        if (page.length < PAGE) break;
      }
      tables[t] = rows;
    }
    const profile = await api.profile();
    tables.profiles = profile ? [profile] : [];
    // Data from the network is validated like any other input (docs/security.md, rule 1).
    const local = store.get();
    return cleanState(rowsToState(tables, { reminders: local.reminders, meta: local.meta }));
  }

  // Send what's queued, then take the account's copy if nothing changed here meanwhile.
  async function pull() {
    if (pulling) return pulling;
    pulling = (async () => {
      if (!linked) return;
      if (!(await flush()) || Object.keys(ops).length) return;
      if (!online()) { setStatus('offline'); return; }
      const remote = await fetchAccount();
      if (Object.keys(ops).length) return; // a change arrived while fetching; the next pull gets it
      if (!sameRows(stateToRows(remote), stateToRows(store.get()))) applyRemote(remote);
      base = stateToRows(store.get());
      setStatus('synced');
    })().catch(() => { setStatus(online() ? 'error' : 'offline'); scheduleRetry(); });
    try { return await pulling; } finally { pulling = null; }
  }

  function link(remoteRows) {
    linked = true;
    base = remoteRows;
    persist();
  }

  // First contact with the account on this device, or picking up where a reload left off.
  async function sync() {
    if (!api) return;
    if (linked) return pull();
    if (!online()) { setStatus('offline'); scheduleRetry(); return; }
    setStatus('syncing');
    let remote;
    try { remote = await fetchAccount(); } catch { setStatus(online() ? 'error' : 'offline'); scheduleRetry(); return; }
    const local = store.get();
    if (!hasData(remote)) {
      // A new account: this browser's folds become the account's.
      link(stateToRows(remote));
      Object.assign(ops, diffRows(base, stateToRows(local)));
      base = stateToRows(local);
      persist();
      await flush();
    } else if (!hasData(local) || sameRows(stateToRows(remote), stateToRows(local))) {
      link(stateToRows(remote));
      applyRemote(remote);
      setStatus('synced');
    } else {
      remoteForChoice = remote;
      setStatus('choose');
    }
  }

  return {
    status: () => status,

    // Signed in: start syncing as this person.
    async start(newApi, userId) {
      if (uid === userId && api) return;
      api = newApi;
      uid = userId;
      const saved = storage.read() || {};
      const mine = saved.user === userId;
      linked = mine && saved.linked === true;
      ops = mine && saved.ops ? saved.ops : {};
      base = stateToRows(store.get());
      channel = api.channel?.(() => { pull().catch(() => {}); }) || null;
      await sync();
    },

    // Both this browser and the account have folds: 'merge' keeps both, 'account' keeps the
    // account's and parks this browser's copy (store.keepAsideCopy), so nothing is deleted.
    async choose(kind) {
      if (!remoteForChoice) return;
      const remote = remoteForChoice;
      remoteForChoice = null;
      link(stateToRows(remote));
      if (kind === 'merge') {
        store.replaceState(cleanState(mergeStates(remote, store.get()))); // queued as changes
        await flush();
      } else {
        store.keepAsideCopy();
        applyRemote(remote);
        setStatus('synced');
      }
    },

    flush,
    pull,

    // Signed out: stop syncing. The folds stay in this browser; the queue is cleared.
    stop() {
      timers.clearTimeout(flushTimer);
      timers.clearTimeout(retryTimer);
      channel?.close();
      channel = null;
      api = null;
      linked = false;
      ops = {};
      remoteForChoice = null;
      uid = null;
      storage.write({});
      setStatus('off');
    },
  };
}
