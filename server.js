require('dotenv').config();
require('express-async-errors');
const dns = require('dns');
const fs = require('fs');

// Fix DNS lookup for MongoDB Atlas when local resolver is unavailable.
dns.setServers(['1.1.1.1', '8.8.8.8']);

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Initialize Firebase Admin SDK (no-op if not configured)
require('./services/firebase');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const feedbackRoutes = require('./routes/feedback');
const adminRoutes = require('./routes/admin');
const { protect, adminOnly } = require('./middleware/auth');

const app = express();

const publicPath = path.resolve(__dirname, 'public');

app.use(cors());
app.use(express.json());
app.use(express.static(publicPath));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);

const STORES = [
  { id: 'main', name: 'Mahenoor Kirana - Main Store', address: 'Khanpur Gaon, Samastipur, Bihar 843129', phone: '9341782080', lat: 25.5954, lng: 85.6677, hours: '8:00 AM - 10:00 PM', pickupNote: 'Order will be ready in 30 minutes' }
];

app.get('/api/config', (req, res) => res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || '', stores: STORES }));

app.put('/api/orders/:id/location', protect, async (req, res) => {
  const Order = require('./models/Order');
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ message: 'lat and lng required' });
  const order = await Order.findByIdAndUpdate(req.params.id, {
    'deliveryPartner.liveLocation': { lat, lng, updatedAt: new Date() }
  }, { new: true });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json({ order });
});

/* FCM token routes — only admins can register */
app.post('/api/fcm/register', protect, adminOnly, async (req, res) => {
  const FcmToken = require('./models/FcmToken');
  const { token, deviceInfo } = req.body;
  if (!token) return res.status(400).json({ message: 'Token required' });
  const existing = await FcmToken.findOne({ token });
  if (existing) {
    existing.user = req.user._id;
    if (deviceInfo) existing.deviceInfo = deviceInfo;
    await existing.save();
    return res.json({ message: 'Token updated' });
  }
  await FcmToken.create({ user: req.user._id, token, deviceInfo: deviceInfo || '' });
  res.status(201).json({ message: 'Token registered' });
});

app.delete('/api/fcm/unregister', protect, adminOnly, async (req, res) => {
  const FcmToken = require('./models/FcmToken');
  const { token } = req.body;
  if (token) await FcmToken.deleteOne({ token });
  else await FcmToken.deleteMany({ user: req.user._id });
  res.json({ message: 'Token(s) removed' });
});

/* Dynamically serve Firebase SW with env vars injected */
app.get('/firebase-messaging-sw.js', (req, res) => {
  const swPath = path.join(publicPath, 'firebase-messaging-sw.js');
  let content = fs.readFileSync(swPath, 'utf8');
  content = content
    .replace(/'FIREBASE_API_KEY'/g, JSON.stringify(process.env.FIREBASE_API_KEY || ''))
    .replace(/'FIREBASE_PROJECT_ID'/g, JSON.stringify(process.env.FIREBASE_PROJECT_ID || ''))
    .replace(/'FIREBASE_SENDER_ID'/g, JSON.stringify(process.env.FIREBASE_MESSAGING_SENDER_ID || ''))
    .replace(/'FIREBASE_APP_ID'/g, JSON.stringify(process.env.FIREBASE_APP_ID || ''));
  res.type('application/javascript').send(content);
});

/* Inject Firebase client config into admin HTML pages */
function injectFcmConfig(html) {
  if (!process.env.FIREBASE_API_KEY) return html;
  const fcmConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    vapidKey: process.env.FIREBASE_VAPID_KEY || ''
  };
  const script = `<script>window.__FCM_CONFIG__=${JSON.stringify(fcmConfig)};</script>`;
  return html.replace('</head>', script + '</head>');
}

/* Intercept admin HTML pages to inject FCM config */
app.get(['/admin', '/admin/index.html', '/admin/orders.html', '/admin/products.html'], (req, res) => {
  const filePath = req.path === '/admin' ? '/admin/index.html' : req.path;
  const fullPath = path.join(publicPath, filePath);
  if (fs.existsSync(fullPath)) {
    let html = fs.readFileSync(fullPath, 'utf8');
    html = injectFcmConfig(html);
    res.send(html);
  } else {
    res.status(404).send('Not found');
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/tracking/:id', (req, res) => res.sendFile(path.join(publicPath, 'pages', 'tracking.html')));

app.get('*', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => app.listen(PORT, () => console.log(`Mahenoor Kirana v2 on http://localhost:${PORT}`)));
