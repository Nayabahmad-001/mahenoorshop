const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();

const DELIVERY_CHARGE = 20;
const FREE_DELIVERY_THRESHOLD = 100;
const ADMIN_PHONE = '9341782080';

const STORES = [
  { id: 'main', name: 'Mahenoor Kirana - Main Store', address: 'Khanpur Gaon, Samastipur, Bihar 843129', phone: '9341782080', lat: 25.5954, lng: 85.6677, hours: '8:00 AM - 10:00 PM', pickupNote: 'Order will be ready in 30 minutes' }
];

async function sendSmsNotification(message) {
  try {
    const fast2smsApiKey = process.env.FAST2SMS_API_KEY;
    if (!fast2smsApiKey) return;
    const https = require('https');
    const body = JSON.stringify({ route: 'q', numbers: ADMIN_PHONE, message, language: 'unicode' });
    const req = https.request({
      hostname: 'www.fast2sms.com', path: '/dev/bulkV2', method: 'POST',
      headers: { authorization: fast2smsApiKey, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    });
    req.on('error', () => {});
    req.write(body);
    req.end();
  } catch (err) {
    console.log('SMS notification failed (optional):', err.message);
  }
}

async function autoSaveAddress(userId, shippingAddress) {
  const user = await User.findById(userId);
  if (!user) return;
  const hasAddress = user.addresses && user.addresses.length > 0;
  if (!hasAddress && shippingAddress) {
    user.addresses.push({ label: 'Home', ...shippingAddress, isDefault: true });
    user.address = { ...user.address, ...shippingAddress };
    await user.save();
  }
}

router.post('/', protect, async (req, res) => {
  const { items, shippingAddress, phone, deliveryLocation, deliveryMethod, pickupStore } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ message: 'Cart is empty' });
  if (deliveryMethod === 'pickup') {
    if (!pickupStore) return res.status(400).json({ message: 'Pickup store required' });
  } else {
    if (!shippingAddress || !phone) return res.status(400).json({ message: 'Shipping details required' });
  }

  let subtotal = 0, totalMrp = 0;
  const orderItems = [];

  for (const item of items) {
    const product = await Product.findOneAndUpdate(
      { _id: item.product, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
      { new: true }
    );
    if (!product) {
      const exists = await Product.findById(item.product);
      if (!exists) return res.status(400).json({ message: 'Some products not found' });
      return res.status(400).json({ message: `Insufficient stock for ${exists.name}` });
    }
    subtotal += product.sellingPrice * item.quantity;
    totalMrp += product.mrp * item.quantity;
    orderItems.push({
      product: product._id,
      name: product.name,
      quantity: item.quantity,
      mrp: product.mrp,
      sellingPrice: product.sellingPrice,
      image: product.image
    });
  }

  const deliveryCharge = deliveryMethod === 'pickup' ? 0 : (subtotal <= FREE_DELIVERY_THRESHOLD ? DELIVERY_CHARGE : 0);
  const total = subtotal + deliveryCharge;
  const store = deliveryMethod === 'pickup' ? STORES.find(s => s.id === pickupStore) || STORES[0] : null;

  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    deliveryMethod: deliveryMethod || 'delivery',
    shippingAddress: deliveryMethod === 'pickup' ? { street: store.address, city: '', state: '', pincode: '' } : shippingAddress,
    phone: phone || '',
    subtotal,
    deliveryCharge,
    total,
    totalMrp,
    totalSavings: totalMrp - subtotal,
    deliveryLocation: deliveryMethod === 'delivery' ? deliveryLocation : null,
    pickupStore: store ? { id: store.id, name: store.name, address: store.address, phone: store.phone, hours: store.hours } : null,
    paymentMethod: 'cod',
    paymentStatus: 'pending'
  });

  if (deliveryMethod !== 'pickup') {
    await autoSaveAddress(req.user._id, shippingAddress);
  }

  try {
    const user = req.user;
    const itemsSummary = orderItems.map(i => `${i.name}×${i.quantity}`).join(', ');
    const shortId = order._id.toString().slice(-8).toUpperCase();
    const methodLabel = deliveryMethod === 'pickup' ? '🧑‍🍳 Pickup' : '🚚 Delivery';

    await Notification.create({
      type: 'new_order',
      title: `🆕 New ${methodLabel} Order!`,
      message: `${user.name} ordered ${itemsSummary} — ₹${total} | ${methodLabel}${deliveryMethod === 'pickup' ? ` at ${store?.name}` : ` | ${shippingAddress?.street}, ${shippingAddress?.city}`}`,
      link: `/admin/orders.html`,
      relatedId: order._id.toString(),
      priority: 'high'
    });

    const smsMsg = `New Order #${shortId}: ${user.name} ordered ${itemsSummary} Total: Rs.${total}. ${methodLabel}. Phone: ${phone}`;
    sendSmsNotification(smsMsg);
  } catch (notifErr) {
    console.log('Notification creation failed:', notifErr.message);
  }

  res.status(201).json({ order });
});

router.get('/my-orders', protect, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).populate('items.product', 'name image').sort({ createdAt: -1 });
  res.json({ orders });
});

router.get('/:id', protect, async (req, res) => {
  const order = await Order.findById(req.params.id).populate('items.product', 'name image');
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }
  res.json({ order });
});

module.exports = router;
