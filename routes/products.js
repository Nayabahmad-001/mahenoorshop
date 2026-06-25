const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

router.get('/', async (req, res) => {
  const { category, search, sort, page = 1, limit = 20, id } = req.query;
  const query = { isAvailable: true };
  if (category) query.category = category;
  if (search) query.name = { $regex: search, $options: 'i' };
  if (id) query._id = { $in: Array.isArray(id) ? id : [id] };

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Product.countDocuments(query);

  let products;
  if (sort === 'discount') {
    products = await Product.aggregate([
      { $match: query },
      { $addFields: { discountAmount: { $subtract: ['$mrp', '$sellingPrice'] } } },
      { $sort: { discountAmount: -1 } },
      { $skip: skip },
      { $limit: Number(limit) }
    ]);
  } else {
    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { sellingPrice: 1 };
    if (sort === 'price_desc') sortOption = { sellingPrice: -1 };
    if (sort === 'name') sortOption = { name: 1 };
    products = await Product.find(query).sort(sortOption).skip(skip).limit(Number(limit));
  }

  res.json({ products, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

router.get('/featured', async (req, res) => {
  const products = await Product.find({ isAvailable: true, isFeatured: true }).limit(8);
  res.json({ products });
});

router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ product });
});

module.exports = router;
