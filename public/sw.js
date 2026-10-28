// Eightfold service worker: reminders carry "Done" and "In 10 minutes" buttons that reach the open
// tab, and reminders sent with the app closed (D-028) are shown from here. No caching yet.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  const { habitId, date } = event.notification.data || {};
  const act = event.action || 'open';
  event.notification.close();

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // The tracker is /app.html in development and /app when hosted (wrangler.jsonc html_handling).
    const tab = windows.find((c) => /\/app(\.html)?$/.test(new URL(c.url).pathname)) || windows[0];

    if (tab) {
      if (act !== 'open') tab.postMessage({ type: 'eightfold-remind', act, habitId, date });
      else if ('focus' in tab) await tab.focus();
      return;
    }
    // No tab open: open the tracker and let it apply the button that was pressed.
    const params = new URLSearchParams({ remind: act, h: habitId || '', d: date || '' });
    await self.clients.openWindow(`/app.html?${params}`);
  })());
});

// A reminder sent while Eightfold was closed (D-028). Only our sender can reach this device (the
// push service checks its VAPID key), and the message is encrypted for this browser; it's still
// checked field by field before anything is shown.
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const text = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

self.addEventListener('push', (event) => {
  let msg = {};
  try { msg = event.data ? event.data.json() : {}; } catch { msg = {}; }
  const habitId = ID.test(msg.habitId || '') ? msg.habitId : '';
  const date = DAY.test(msg.date || '') ? msg.date : '';
  event.waitUntil(self.registration.showNotification(text(msg.title, 140) || 'Eightfold', {
    body: text(msg.body, 300) || 'A habit is coming up.',
    tag: habitId && date ? `${date}:${habitId}` : 'eightfold',
    renotify: true,
    icon: '/icon-192.png',
    badge: '/badge-96.png',
    data: { habitId, date },
  }));
});
