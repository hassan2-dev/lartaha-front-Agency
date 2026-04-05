/* eslint-disable no-restricted-globals */
self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const title = data.title || 'New Message';
    const options = {
      body: data.body || '',
      icon: data.icon || '/favicon.svg',
      badge: data.badge || '/favicon.svg',
      data: {
        conversationId: data.conversationId,
        url: data.conversationId ? `/chat?conversationId=${data.conversationId}` : '/chat',
      },
      tag: data.tag || 'general-notification',
      renotify: true,
      vibrate: [100, 50, 100],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle edge cases like subscription change
self.addEventListener('pushsubscriptionchange', function (event) {
  // In a real app, you might want to resubscribe the user here
  console.log('[SW] Push subscription change');
});
