const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  quantity: { type: Number, required: true, min: 1 },
  mrp: Number,
  sellingPrice: Number,
  image: String
});

const statusHistorySchema = new mongoose.Schema({
  status: String,
  timestamp: { type: Date, default: Date.now },
  note: String
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  deliveryMethod: { type: String, enum: ['delivery', 'pickup'], default: 'delivery' },
  shippingAddress: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String }
  },
  phone: { type: String, required: true },
  subtotal: { type: Number, required: true },
  deliveryCharge: { type: Number, default: 0 },
  total: { type: Number, required: true },
  totalMrp: { type: Number, required: true },
  totalSavings: { type: Number, required: true },
  deliveryLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  pickupStore: {
    id: String,
    name: String,
    address: String,
    phone: String,
    hours: String
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled'],
    default: 'pending'
  },
  statusHistory: [statusHistorySchema],
  paymentMethod: { type: String, enum: ['cod', 'razorpay'], default: 'cod' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  razorpayDetails: {
    orderId: String,
    paymentId: String,
    signature: String
  },
  deliveryOtp: { type: String },
  deliveryPartner: {
    name: String,
    phone: String,
    liveLocationLink: String,
    liveLocation: {
      lat: Number,
      lng: Number,
      updatedAt: Date
    }
  }
}, { timestamps: true });

orderSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    const last = this.statusHistory[this.statusHistory.length - 1];
    if (!last || last.status !== this.status) {
      this.statusHistory.push({ status: this.status, timestamp: new Date() });
    }
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
