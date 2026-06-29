require('dotenv').config();
require('express-async-errors');
const dns = require('dns');

// Fix DNS lookup for MongoDB Atlas when local resolver is unavailable.
dns.setServers(['1.1.1.1', '8.8.8.8']);

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const feedbackRoutes = require('./routes/feedback');
const adminRoutes = require('./routes/admin');
const { protect } = require('./middleware/auth');

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

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/tracking/:id', (req, res) => res.sendFile(path.join(publicPath, 'pages', 'tracking.html')));

app.get('*', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => app.listen(PORT, () => console.log(`Mahenoor Kirana v2 on http://localhost:${PORT}`)));
