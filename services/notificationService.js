const admin = require('./firebase');
const FcmToken = require('../models/FcmToken');

async function sendPushToAllAdmins(title, body, data = {}) {
  if (!admin.apps.length) {
    console.log('Firebase not configured — skipping push notification');
    return;
  }

  try {
    const tokens = await FcmToken.find();
    if (!tokens.length) {
      console.log('No admin FCM tokens registered');
      return;
    }

    const message = {
      notification: { title, body },
      data: { click_action: 'FLUTTER_NOTIFICATION_CLICK', ...data },
      android: { priority: 'high', ttl: 86400000 },
      apns: { payload: { aps: { sound: 'default', badge: 1, 'content-available': 1 } } },
      webpush: {
        headers: { Urgency: 'high', TTL: '86400' },
        notification: { vibrate: [200, 100, 200], icon: '/favicon.ico', requireInteraction: true }
      }
    };

    const tokenStrings = tokens.map(t => t.token);
    const result = await admin.messaging().sendEachForMulticast({ ...message, tokens: tokenStrings });

    const failedTokens = [];
    result.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errCode = resp.error?.code;
        if (errCode === 'messaging/invalid-registration-token' || errCode === 'messaging/registration-token-not-registered') {
          failedTokens.push(tokenStrings[idx]);
        }
      }
    });

    if (failedTokens.length > 0) {
      await FcmToken.deleteMany({ token: { $in: failedTokens } });
      console.log(`Cleaned up ${failedTokens.length} invalid FCM tokens`);
    }

    console.log(`FCM: ${result.successCount} sent, ${result.failureCount} failed`);
  } catch (err) {
    console.error('FCM send error:', err.message);
  }
}

module.exports = { sendPushToAllAdmins };
