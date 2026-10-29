// Reminders: checks every 20 seconds whether a habit is due, then nudges with a system
// notification when the tab is in the background, or a paper note on the page when it
// is in front. Browsers only run this while a One More Fold tab is open.
import { gsap } from 'gsap';
import { store } from '../lib/store.js';
import { monthKey, minutesOf } from '../lib/dates.js';
import { streakOf, runWords } from '../lib/stats.js';
import { unitOf } from '../lib/schedule.js';
import { dueReminders, nextReminder, settingsOf, logKey, SNOOZE_MINUTES } from '../lib/reminders-core.js';
import { sfxPop } from './paper.js';
import { esc, isId, isDate } from '../lib/sanitize.js';

const supported = () => typeof window !== 'undefined' && 'Notification' in window;
let registration = null;
let notify = () => {};
// This device gets reminders from the server with the app closed (D-028), so the tab doesn't send
// system notifications of its own: only the paper note while the page is in front.
let pushHere = false;
export const setPushHere = (on) => { pushHere = on; };

export function permissionState() {
  if (!supported()) return 'unsupported';
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

function message({ habit, late }, lead) {
  const today = new Date();
  const streak = streakOf(store.get(), habit.id, { y: today.getFullYear(), m: today.getMonth() + 1, d: today.getDate() });
  const run = streak.n ? ` Keep your ${runWords(streak)} going.` : '';
  const when = { week: ' this week', month: ' this month' }[unitOf(habit)] || ' today';
  const body = late
    ? `${habit.name} was due at ${habit.time}. There's still time${when}.${run}`
    : lead
      ? `${habit.name} starts at ${habit.time}, in ${lead} minutes.${run}`
      : `Time to fold${when === ' today' ? " today's" : ''} ${habit.name}${when === ' today' ? '' : when}.${run}`;
  return { title: `${habit.name} · ${habit.time}`, body };
}

// ---------- Acting on a reminder (from the page note or a notification button) ----------
// trusted: the action came from our own service worker. A URL (opened from a notification while
// no tab was open) is only obeyed if that reminder really fired, so a crafted link can't tick habits.
function apply(act, habitId, date, { trusted = false } = {}) {
  if (!['done', 'snooze'].includes(act) || !isId(habitId) || !isDate(date)) return;
  if (!trusted && !store.reminders().log[`${date}:${habitId}`]?.firedAt) return;
  const [y, m, d] = date.split('-').map(Number);
  const habit = store.month(monthKey(y, m))?.habits.find((h) => h.id === habitId);
  if (!habit) return;
  if (act === 'done') {
    store.toggle(monthKey(y, m), habitId, d, true);
    notify(`${habit.name} folded. One more crane.`);
  } else if (act === 'snooze') {
    store.logReminder(`${date}:${habitId}`, { snoozeUntil: Date.now() + SNOOZE_MINUTES * 60000 });
    notify(`Okay. ${habit.name} again in ${SNOOZE_MINUTES} minutes.`);
  }
}

// ---------- The paper note ----------
function notesHost() {
  let host = document.querySelector('.nudges');
  if (!host) {
    host = document.createElement('div');
    host.className = 'nudges';
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label', 'Reminders');
    host.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-nudge]');
      if (!btn) return;
      const note = btn.closest('.nudge');
      if (btn.dataset.nudge !== 'dismiss') apply(btn.dataset.nudge, note.dataset.habit, note.dataset.date, { trusted: true });
      closeNote(note);
    });
    document.body.appendChild(host);
  }
  return host;
}

function closeNote(note) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return note.remove();
  gsap.to(note, { x: 60, rotate: 6, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: () => note.remove() });
}

function showNote(item, text) {
  const host = notesHost();
  host.querySelector(`[data-key="${CSS.escape(item.key)}"]`)?.remove();
  const note = document.createElement('div');
  note.className = 'nudge sheet-wrap';
  note.dataset.key = item.key;
  note.dataset.habit = item.habit.id;
  note.dataset.date = item.key.slice(0, 10);
  note.style.setProperty('--c', store.color(item.habit.id));
  note.innerHTML = `
    <span class="tape" style="top:-13px;left:42%;transform:rotate(-4deg)"></span>
    <div class="nudge-sheet">
      <p class="nudge-time"><i></i>${esc(item.habit.time)}</p>
      <h2 class="nudge-title"></h2>
      <p class="nudge-body"></p>
      <div class="nudge-actions">
        <button class="btn" type="button" data-nudge="done">Done</button>
        <button class="btn btn--quiet" type="button" data-nudge="snooze">In ${SNOOZE_MINUTES} minutes</button>
        <button class="nudge-close" type="button" data-nudge="dismiss" aria-label="Dismiss reminder">×</button>
      </div>
    </div>`;
  note.querySelector('.nudge-title').textContent = item.habit.name;
  note.querySelector('.nudge-body').textContent = text.body;
  host.appendChild(note);
  while (host.children.length > 3) host.firstElementChild.remove();
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.fromTo(note, { y: 80, rotate: -8, opacity: 0 }, { y: 0, rotate: -1.5, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' });
    const r = note.getBoundingClientRect();
    setTimeout(() => sfxPop(r.left + 30, r.top + 8, 'ピコン', { size: 24 }), 250);
  }
}

// ---------- Firing ----------
async function systemNotify(item, text) {
  if (permissionState() !== 'granted') return false;
  const options = {
    body: text.body,
    tag: item.key,
    renotify: true,
    icon: '/icon-192.png',
    badge: '/badge-96.png',
    data: { habitId: item.habit.id, date: item.key.slice(0, 10) },
    actions: [{ action: 'done', title: 'Done' }, { action: 'snooze', title: `In ${SNOOZE_MINUTES} minutes` }],
  };
  try {
    if (registration) { await registration.showNotification(text.title, options); return true; }
    const { actions, ...plain } = options;
    const n = new Notification(text.title, plain);
    n.onclick = () => { window.focus(); n.close(); };
    return true;
  } catch { return false; }
}

async function fire(item, { test = false } = {}) {
  const text = message(item, settingsOf(store.get()).lead);
  if (!test) store.logReminder(item.key, { firedAt: Date.now(), snoozeUntil: null });
  const inFront = document.visibilityState === 'visible';
  if (pushHere && !test) { if (inFront) showNote(item, text); return; }
  const sent = (!inFront || test) && await systemNotify(item, text);
  // In front, the note is enough; in the background without permission, the note waits on the page.
  if (inFront || !sent) showNote(item, text);
}

function tick() {
  dueReminders(store.get(), new Date()).forEach((item, i) => setTimeout(() => fire(item), i * 900));
}

// ---------- Public ----------
export async function enableReminders() {
  let permission = permissionState();
  if (permission === 'default') permission = await Notification.requestPermission();
  store.setReminders({ enabled: true });
  tick();
  return permission;
}

export function disableReminders() { store.setReminders({ enabled: false }); }

// A sample nudge for the next timed habit, so the look and the permission can be checked.
export function sendTestReminder() {
  const now = new Date();
  const month = store.month(monthKey(now.getFullYear(), now.getMonth() + 1));
  const habit = nextReminder(store.get(), now)?.habit
    || [...(month?.habits || [])].filter((h) => h.time).sort((a, b) => minutesOf(a.time) - minutesOf(b.time))[0];
  if (!habit) return false;
  fire({ habit, key: logKey(now, habit.id), late: false }, { test: true });
  return true;
}

export { nextReminder };

export function startReminders({ toast } = {}) {
  if (toast) notify = toast;
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('/sw.js').then((reg) => { registration = reg; }).catch(() => {});
    navigator.serviceWorker.addEventListener('message', (e) => {
      // Only messages from our own service worker are acted on.
      if (e.source === navigator.serviceWorker.controller && e.data?.type === 'eightfold-remind') {
        apply(e.data.act, e.data.habitId, e.data.date, { trusted: true });
      }
    });
  }
  // Opened from a notification button while no tab was open.
  const params = new URLSearchParams(location.search);
  if (params.get('remind')) {
    apply(params.get('remind'), params.get('h'), params.get('d'));
    history.replaceState(null, '', location.pathname + location.hash);
  }
  tick();
  setInterval(tick, 20000);
  document.addEventListener('visibilitychange', tick);
}
