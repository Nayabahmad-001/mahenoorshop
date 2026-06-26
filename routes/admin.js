const express = require('express');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(protect, adminOnly);

router.get('/dashboard', async (req, res) => {
  const [totalProducts, totalOrders, totalUsers, pendingOrders, lowStockItems, revenueResult] = await Promise.all([
    Product.countDocuments(),
    Order.countDocuments(),
    User.countDocuments({ role: 'user' }),
    Order.countDocuments({ status: 'pending' }),
    Product.countDocuments({ stock: { $lte: 10 }, isAvailable: true }),
    Order.aggregate([
      { $match: { status: { $nin: ['cancelled'] } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$total', '$subtotal'] } } } }
    ])
  ]);
  const totalRevenue = revenueResult[0]?.total || 0;
  const outOfStock = await Product.countDocuments({ stock: 0, isAvailable: true });
  res.json({ totalProducts, totalOrders, totalUsers, totalRevenue, pendingOrders, lowStockItems, outOfStock });
});

router.get('/products', async (req, res) => {
  const { page = 1, limit = 100, category } = req.query;
  const query = {};
  if (category) query.category = category;
  const total = await Product.countDocuments(query);
  const products = await Product.find(query).sort({ createdAt: -1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit));
  res.json({ products, total, pages: Math.ceil(total / Number(limit)) });
});

router.post('/products', async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json({ product });
});

router.put('/products/:id', async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ product });
});

router.delete('/products/:id', async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ message: 'Product deleted' });
});

router.get('/orders', async (req, res) => {
  const { status, page = 1, limit = 100 } = req.query;
  const query = {};
  if (status) query.status = status;
  const total = await Order.countDocuments(query);
  const orders = await Order.find(query).populate('user', 'name email phone').sort({ createdAt: -1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit));
  res.json({ orders, total, pages: Math.ceil(total / Number(limit)) });
});

router.put('/orders/:id/status', async (req, res) => {
  const { status, note } = req.body;
  const valid = ['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ message: 'Invalid status' });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.status === status) return res.json({ order });
  order.status = status;
  if (note) {
    const lastEntry = order.statusHistory[order.statusHistory.length - 1];
    if (lastEntry) lastEntry.note = note;
  }
  await order.save();
  res.json({ order });
});

router.get('/users', async (req, res) => {
  const users = await User.find({ role: 'user' }).sort({ createdAt: -1 });
  res.json({ users });
});

module.exports = router;
