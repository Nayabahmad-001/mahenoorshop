const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const DELIVERY_CHARGE = 20;
const FREE_DELIVERY_THRESHOLD = 500;

let razorpayInstance = null;
function getRazorpay() {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
  return razorpayInstance;
}

async function autoSaveAddress(userId, shippingAddress) {
  const user = await User.findById(userId);
  if (!user) return;
  const hasAddress = user.address && (user.address.street || user.address.city || user.address.state || user.address.pincode);
  if (!hasAddress) {
    user.address = { ...user.address, ...shippingAddress };
    await user.save();
  }
}

router.post('/', protect, async (req, res) => {
  const { items, shippingAddress, phone, deliveryLocation } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ message: 'Cart is empty' });
  if (!shippingAddress || !phone) return res.status(400).json({ message: 'Shipping details required' });

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

  const deliveryCharge = subtotal <= FREE_DELIVERY_THRESHOLD ? DELIVERY_CHARGE : 0;
  const total = subtotal + deliveryCharge;

  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    phone,
    subtotal,
    deliveryCharge,
    total,
    totalMrp,
    totalSavings: totalMrp - subtotal,
    deliveryLocation,
    paymentMethod: 'cod',
    paymentStatus: 'pending'
  });

  await autoSaveAddress(req.user._id, shippingAddress);

  res.status(201).json({ order });
});

router.post('/razorpay/init', protect, async (req, res) => {
  const { items, shippingAddress, phone, deliveryLocation } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ message: 'Cart is empty' });
  if (!shippingAddress || !phone) return res.status(400).json({ message: 'Shipping details required' });

  let subtotal = 0, totalMrp = 0;
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) return res.status(400).json({ message: 'Some products not found' });
    if (product.stock < item.quantity) return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
    subtotal += product.sellingPrice * item.quantity;
    totalMrp += product.mrp * item.quantity;
  }

  const deliveryCharge = subtotal <= FREE_DELIVERY_THRESHOLD ? DELIVERY_CHARGE : 0;
  const total = subtotal + deliveryCharge;
  const amountInPaise = Math.round(total * 100);

  try {
    const rzp = getRazorpay();
    const rzpOrder = await rzp.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    });

    res.json({
      key: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: rzpOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      subtotal,
      totalMrp,
      totalSavings: totalMrp - subtotal,
      deliveryCharge
    });
  } catch (err) {
    console.error('Razorpay error:', err);
    res.status(500).json({ message: 'Payment initiation failed. Please try COD.' });
  }
});

router.post('/razorpay/verify', protect, async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, items, shippingAddress, phone, deliveryLocation } = req.body;

  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    return res.status(400).json({ message: 'Payment verification failed' });
  }

  if (!items || items.length === 0) return res.status(400).json({ message: 'Cart is empty' });
  if (!shippingAddress || !phone) return res.status(400).json({ message: 'Shipping details required' });

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

  const deliveryCharge = subtotal <= FREE_DELIVERY_THRESHOLD ? DELIVERY_CHARGE : 0;
  const total = subtotal + deliveryCharge;

  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    phone,
    subtotal,
    deliveryCharge,
    total,
    totalMrp,
    totalSavings: totalMrp - subtotal,
    deliveryLocation,
    paymentMethod: 'razorpay',
    paymentStatus: 'paid',
    razorpayDetails: {
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature
    }
  });

  await autoSaveAddress(req.user._id, shippingAddress);

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
