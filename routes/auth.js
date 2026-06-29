const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();
const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });
  if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already registered' });
  const user = await User.create({ name, email, password });
  res.status(201).json({ token: signToken(user._id), user });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: 'Invalid credentials' });
  res.json({ token: signToken(user._id), user });
});

router.post('/google', async (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(400).json({ message: 'Google sign-in is not configured' });
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ message: 'Google credential required' });
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const { email, name, sub } = payload;
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name, email, password: `google_${sub}_${Date.now()}` });
    }
    res.json({ token: signToken(user._id), user });
  } catch {
    return res.status(401).json({ message: 'Invalid Google credential' });
  }
});

router.get('/me', protect, (req, res) => res.json({ user: req.user }));

router.put('/profile', protect, async (req, res) => {
  const { name, phone, address } = req.body;
  const user = await User.findById(req.user._id);
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (address) {
    user.address = { ...user.address, ...address };
    const existingDefault = user.addresses.find(a => a.isDefault) || user.addresses[0];
    if (existingDefault) {
      Object.assign(existingDefault, address);
    } else {
      user.addresses.push({ ...address, label: 'Home', isDefault: true });
    }
  }
  await user.save();
  res.json({ user });
});

router.get('/addresses', protect, (req, res) => {
  res.json({ addresses: req.user.addresses || [] });
});

router.post('/addresses', protect, async (req, res) => {
  const { label, street, city, state, pincode, lat, lng, isDefault } = req.body;
  if (!street || !city || !pincode) return res.status(400).json({ message: 'Street, city, and pincode required' });
  const user = await User.findById(req.user._id);
  if (isDefault) {
    user.addresses.forEach(a => a.isDefault = false);
  }
  const newAddress = { label: label || 'Home', street, city, state: state || '', pincode, lat, lng, isDefault: !!isDefault };
  if (user.addresses.length === 0) newAddress.isDefault = true;
  user.addresses.push(newAddress);
  if (newAddress.isDefault || user.addresses.length === 1) {
    user.address = { street, city, state: state || '', pincode };
  }
  await user.save();
  res.status(201).json({ addresses: user.addresses });
});

router.put('/addresses/:addrId', protect, async (req, res) => {
  const { label, street, city, state, pincode, lat, lng, isDefault } = req.body;
  const user = await User.findById(req.user._id);
  const addr = user.addresses.id(req.params.addrId);
  if (!addr) return res.status(404).json({ message: 'Address not found' });
  if (isDefault) {
    user.addresses.forEach(a => a.isDefault = false);
    addr.isDefault = true;
  }
  if (label) addr.label = label;
  if (street !== undefined) addr.street = street;
  if (city !== undefined) addr.city = city;
  if (state !== undefined) addr.state = state;
  if (pincode !== undefined) addr.pincode = pincode;
  if (lat !== undefined) addr.lat = lat;
  if (lng !== undefined) addr.lng = lng;
  if (addr.isDefault) {
    user.address = { street: addr.street, city: addr.city, state: addr.state, pincode: addr.pincode };
  }
  await user.save();
  res.json({ addresses: user.addresses });
});

router.delete('/addresses/:addrId', protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  const addr = user.addresses.id(req.params.addrId);
  if (!addr) return res.status(404).json({ message: 'Address not found' });
  const wasDefault = addr.isDefault;
  addr.deleteOne();
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
    const d = user.addresses[0];
    user.address = { street: d.street, city: d.city, state: d.state, pincode: d.pincode };
  } else if (user.addresses.length === 0) {
    user.address = { street: '', city: '', state: '', pincode: '' };
  }
  await user.save();
  res.json({ addresses: user.addresses });
});

module.exports = router;
