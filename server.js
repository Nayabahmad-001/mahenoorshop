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
const adminRoutes = require('./routes/admin');

const app = express();

const publicPath = path.resolve(__dirname, 'public');

app.use(cors());
app.use(express.json());
app.use(express.static(publicPath));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('*', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => app.listen(PORT, () => console.log(`Mahenoor Kirana v2 on http://localhost:${PORT}`)));
