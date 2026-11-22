// Minimal service worker: makes FRESHLOOP installable and lets it show system notifications.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Opening a notification focuses the app on the related product.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const client = clients.find((c) => 'focus' in c);
      if (client) {
        client.navigate(url);
        return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
