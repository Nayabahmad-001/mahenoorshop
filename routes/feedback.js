const express = require('express');
const Feedback = require('../models/Feedback');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, async (req, res) => {
  const { orderId, rating, comment } = req.body;
  if (!orderId || !rating) return res.status(400).json({ message: 'Order ID and rating required' });
  if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' });

  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
  if (order.status !== 'delivered') return res.status(400).json({ message: 'Can only review delivered orders' });

  const existing = await Feedback.findOne({ user: req.user._id, order: orderId });
  if (existing) return res.status(400).json({ message: 'You already reviewed this order' });

  const feedback = await Feedback.create({ user: req.user._id, order: orderId, rating, comment });
  res.status(201).json({ feedback });
});

router.get('/order/:orderId', protect, async (req, res) => {
  const feedback = await Feedback.findOne({ order: req.params.orderId }).populate('user', 'name');
  res.json({ feedback });
});

router.get('/my-feedback', protect, async (req, res) => {
  const feedbacks = await Feedback.find({ user: req.user._id }).populate('order', 'status total').sort({ createdAt: -1 });
  res.json({ feedbacks });
});

module.exports = router;
