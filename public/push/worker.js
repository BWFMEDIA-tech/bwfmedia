// Messaging only: no fetch interception, caching, account tokens or audio control.
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* Always show a visible notification. */ }
  event.waitUntil(self.registration.showNotification(String(data.title || 'TUNEVIO').slice(0, 120), {
    body: String(data.body || '').slice(0, 250), icon: '/icon-192.png', badge: '/icon-192.png',
    tag: String(data.id || 'tunevio-notification'),
    data: { link: data.link },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  let link = event.notification.data?.link;
  if (typeof link !== 'string' || !link.startsWith('/') || link.startsWith('//') || /[\\\u0000-\u001f]/.test(link)) link = '/notifications';
  const url = new URL(link, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => client.url === url);
    if (existing) return existing.focus();
    return self.clients.openWindow(url);
  })());
});