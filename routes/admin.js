const express = require('express');
const crypto = require('crypto');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Notification = require('../models/Notification');
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
  const orders = await Order.find(query).populate('user', 'name email phone address').sort({ createdAt: -1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit));
  res.json({ orders, total, pages: Math.ceil(total / Number(limit)) });
});

router.put('/orders/:id/status', async (req, res) => {
  const { status, note, otp, deliveryPartner } = req.body;
  const valid = ['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ message: 'Invalid status' });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.status === status) return res.json({ order });

  if (status === 'delivered') {
    if (!order.deliveryOtp) return res.status(400).json({ message: 'No OTP set for this order. Dispatch first.' });
    if (!otp) return res.status(400).json({ message: 'OTP is required to mark as delivered.' });
    if (otp !== order.deliveryOtp) return res.status(400).json({ message: 'Incorrect OTP. Please get the correct OTP from the customer.' });
  }

  if (status === 'dispatched') {
    const generatedOtp = crypto.randomInt(1000, 9999).toString();
    order.deliveryOtp = generatedOtp;
    if (deliveryPartner) {
      order.deliveryPartner = {
        name: deliveryPartner.name || '',
        phone: deliveryPartner.phone || '',
        liveLocationLink: deliveryPartner.liveLocationLink || ''
      };
    }
    const partnerInfo = deliveryPartner ? `Delivery by ${deliveryPartner.name} (${deliveryPartner.phone})` : '';
    const otpNote = [note, partnerInfo, `OTP: ${generatedOtp}`].filter(Boolean).join(' | ');
    order.statusHistory.push({ status, timestamp: new Date(), note: otpNote });
    order.status = status;
    await order.save();
    return res.json({ order, deliveryOtp: generatedOtp });
  }

  order.statusHistory.push({ status, timestamp: new Date(), note: note || '' });
  order.status = status;
  await order.save();
  res.json({ order });
});

router.get('/users', async (req, res) => {
  const users = await User.find({ role: 'user' }).sort({ createdAt: -1 });
  res.json({ users });
});

router.get('/users/stats', async (req, res) => {
  const stats = await Order.aggregate([
    { $group: { _id: '$user', totalOrders: { $sum: 1 }, totalSpent: { $sum: { $ifNull: ['$total', '$subtotal'] } } } },
    { $sort: { totalOrders: -1 } }
  ]);
  const users = await User.find({ role: 'user' }).lean();
  const userMap = {};
  users.forEach(u => { userMap[u._id.toString()] = u; });
  const result = stats.map(s => ({
    _id: s._id,
    name: userMap[s._id.toString()]?.name || 'Unknown',
    email: userMap[s._id.toString()]?.email || '',
    phone: userMap[s._id.toString()]?.phone || '',
    address: userMap[s._id.toString()]?.address || null,
    totalOrders: s.totalOrders,
    totalSpent: s.totalSpent
  }));
  const noOrderUsers = users.filter(u => !stats.find(s => s._id.toString() === u._id.toString()));
  noOrderUsers.forEach(u => {
    result.push({ _id: u._id, name: u.name, email: u.email, phone: u.phone, address: u.address || null, totalOrders: 0, totalSpent: 0 });
  });
  res.json({ users: result });
});

router.get('/notifications', async (req, res) => {
  const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
  const unreadCount = await Notification.countDocuments({ isRead: false });
  res.json({ notifications, unreadCount });
});

router.put('/notifications/read-all', async (req, res) => {
  await Notification.updateMany({ isRead: false }, { isRead: true });
  res.json({ message: 'All notifications marked as read' });
});

router.put('/notifications/:id/read', async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ message: 'Notification marked as read' });
});

module.exports = router;
