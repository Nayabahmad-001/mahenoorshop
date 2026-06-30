(function() {
  var cfg = window.__FCM_CONFIG__;
  if (!cfg || !cfg.apiKey) { console.log('FCM not configured'); return; }

  function waitForAuth() {
    if (typeof apiCall !== 'function' || typeof firebase === 'undefined') {
      setTimeout(waitForAuth, 300);
      return;
    }
    initFCM();
  }

  function initFCM() {
    if (firebase.apps.length) return;
    firebase.initializeApp(cfg);
    var messaging = firebase.messaging();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
        .then(function() { requestPermission(messaging); })
        .catch(function(e) { console.log('SW error:', e); });
    } else {
      requestPermission(messaging);
    }
  }

  function requestPermission(messaging) {
    Notification.requestPermission().then(function(perm) {
      if (perm !== 'granted') return;
      messaging.getToken({ vapidKey: cfg.vapidKey || '' }).then(function(token) {
        if (token) {
          apiCall('/fcm/register', {
            method: 'POST',
            body: JSON.stringify({ token: token, deviceInfo: navigator.userAgent })
          }).catch(function(e) { console.log('FCM reg error:', e); });
        }
      }).catch(function(e) { console.log('Token error:', e); });
    }).catch(function(e) { console.log('Perm error:', e); });
  }

  var s = document.createElement('script');
  s.src = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js';
  s.onload = function() {
    var s2 = document.createElement('script');
    s2.src = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js';
    s2.onload = waitForAuth;
    document.head.appendChild(s2);
  };
  document.head.appendChild(s);
})();
