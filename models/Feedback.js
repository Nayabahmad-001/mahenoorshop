const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 500, default: '' }
}, { timestamps: true });

feedbackSchema.index({ user: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
