const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

const router = express.Router();

const STORE_LOCATION = { lat: 28.6139, lng: 77.2090 };
const MAX_DELIVERY_KM = 5;
const DELIVERY_CHARGE = 20;
const FREE_DELIVERY_THRESHOLD = 500;

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

router.post('/', protect, async (req, res) => {
  const { items, shippingAddress, phone, deliveryLocation } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ message: 'Cart is empty' });
  if (!shippingAddress || !phone) return res.status(400).json({ message: 'Shipping details required' });

  if (deliveryLocation && deliveryLocation.lat && deliveryLocation.lng) {
    const dist = getDistanceKm(STORE_LOCATION.lat, STORE_LOCATION.lng, deliveryLocation.lat, deliveryLocation.lng);
    if (dist > MAX_DELIVERY_KM) {
      return res.status(400).json({ message: `Delivery only available within ${MAX_DELIVERY_KM} km of our store` });
    }
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
    deliveryLocation
  });

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
