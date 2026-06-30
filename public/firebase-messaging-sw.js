/* THIS FILE IS SERVED DYNAMICALLY BY THE SERVER — DO NOT EDIT DIRECTLY */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'FIREBASE_API_KEY',
  projectId: 'FIREBASE_PROJECT_ID',
  messagingSenderId: 'FIREBASE_SENDER_ID',
  appId: 'FIREBASE_APP_ID'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const { title, body } = payload.notification || {};
  const data = payload.data || {};
  const options = {
    body: body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: { url: data.url || '/admin/orders.html' }
  };
  self.registration.showNotification(title || 'Mahenoor Kirana', options);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/admin/orders.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes('/admin/') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
