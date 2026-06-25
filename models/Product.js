const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, required: true, enum: ['Daily Ration', 'Cold Drinks'] },
  description: { type: String, default: '', maxlength: 500 },
  image: { type: String, default: '' },
  mrp: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true, default: 'piece' },
  stock: { type: Number, required: true, min: 0, default: 0 },
  isAvailable: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  tags: [{ type: String }]
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

productSchema.virtual('discountPercent').get(function () {
  if (this.mrp <= 0) return 0;
  return Math.round(((this.mrp - this.sellingPrice) / this.mrp) * 100);
});

productSchema.virtual('savings').get(function () {
  return Math.round(this.mrp - this.sellingPrice);
});

productSchema.virtual('stockStatus').get(function () {
  if (this.stock === 0) return 'out-of-stock';
  if (this.stock <= 5) return 'critical';
  if (this.stock <= 20) return 'low';
  return 'in-stock';
});

module.exports = mongoose.model('Product', productSchema);
