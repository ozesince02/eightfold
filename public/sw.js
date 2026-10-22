// Eightfold service worker: only here so reminders can carry "Done" and "In 10 minutes"
// buttons and reach the open tab when one is pressed. No caching yet.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  const { habitId, date } = event.notification.data || {};
  const act = event.action || 'open';
  event.notification.close();

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const tab = windows.find((c) => new URL(c.url).pathname.endsWith('/app.html')) || windows[0];

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
