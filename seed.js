require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Seeding...');

  await Promise.all([User.deleteMany({}), Product.deleteMany({}), Order.deleteMany({})]);

  const admin = await User.create({
    name: 'Mahenoor Store Owner', email: 'admin@mahenoor.com', password: 'admin123', phone: '9876543210', role: 'admin'
  });
  const admin2 = await User.create({
    name: 'Nayab Ahmad', email: 'nayab.ahmad7987@gmail.com', password: 'nayab@8969', phone: '0000000000', role: 'admin'
  });
  const user = await User.create({
    name: 'Ravi Sharma', email: 'user@demo.com', password: 'user123', phone: '9876543211'
  });

  console.log(`Admin: admin@mahenoor.com / admin123`);
  console.log(`Admin2: nayab.ahmad7987@gmail.com / nayab@8969`);
  console.log(`User:  user@demo.com / user123`);

  const ration = [
    { name: 'Fortune Chakki Fresh Atta', unit: '10 kg', mrp: 375, sp: 340, stock: 85 },
    { name: 'India Gate Basmati Rice', unit: '5 kg', mrp: 625, sp: 549, stock: 42 },
    { name: 'Daawat Biryani Rice', unit: '1 kg', mrp: 145, sp: 125, stock: 28 },
    { name: 'Kohinoor Charminar Rice', unit: '10 kg', mrp: 1050, sp: 925, stock: 18 },
    { name: 'Tata Salt', unit: '1 kg', mrp: 25, sp: 22, stock: 200 },
    { name: 'Fortune Sunflower Oil', unit: '1 L', mrp: 195, sp: 175, stock: 65 },
    { name: 'Fortune Mustard Oil', unit: '1 L', mrp: 210, sp: 188, stock: 55 },
    { name: 'Fortune Ghee', unit: '1 L', mrp: 595, sp: 540, stock: 22 },
    { name: 'Tata Tea Premium', unit: '500 g', mrp: 250, sp: 225, stock: 48 },
    { name: 'Red Label Natural Care', unit: '250 g', mrp: 155, sp: 140, stock: 58 },
    { name: 'Brooke Bond Taj Mahal', unit: '250 g', mrp: 175, sp: 158, stock: 35 },
    { name: 'Nestle Everyday Milk Powder', unit: '400 g', mrp: 145, sp: 130, stock: 45 },
    { name: 'Maggi Masala Noodles', unit: '12 pack', mrp: 168, sp: 145, stock: 92 },
    { name: 'Parle-G Glucose Biscuits', unit: '1 kg', mrp: 110, sp: 96, stock: 150 },
    { name: 'Hide & Seek Biscuits', unit: '400 g', mrp: 85, sp: 74, stock: 70 },
    { name: 'Fortune Besan', unit: '1 kg', mrp: 95, sp: 82, stock: 38 },
    { name: 'Fortune Maida', unit: '1 kg', mrp: 52, sp: 44, stock: 45 },
    { name: 'Fortune Sooji', unit: '500 g', mrp: 45, sp: 38, stock: 42 },
    { name: 'Tata Sampann Toor Dal', unit: '1 kg', mrp: 185, sp: 165, stock: 32 },
    { name: 'Tata Sampann Moong Dal', unit: '1 kg', mrp: 165, sp: 148, stock: 35 },
    { name: 'Tata Sampann Chana Dal', unit: '1 kg', mrp: 135, sp: 118, stock: 30 },
    { name: 'Tata Sampann Masoor Dal', unit: '1 kg', mrp: 125, sp: 108, stock: 28 },
    { name: 'MTR Mixed Pickle', unit: '500 g', mrp: 110, sp: 95, stock: 25 },
    { name: 'Kissan Tomato Ketchup', unit: '1 kg', mrp: 125, sp: 108, stock: 40 },
    { name: 'Patanjali Ghee', unit: '1 L', mrp: 450, sp: 410, stock: 15 },
    { name: 'Saffola Gold Oil', unit: '1 L', mrp: 235, sp: 210, stock: 30 },
    { name: 'Fortune Rawa', unit: '500 g', mrp: 42, sp: 36, stock: 35 },
    { name: 'Tata Sampann Rajma', unit: '500 g', mrp: 95, sp: 82, stock: 25 },
    { name: 'Tata Sampann Chole', unit: '500 g', mrp: 90, sp: 78, stock: 25 },
    { name: 'Milton Thermosteel Bottle', unit: '1 L', mrp: 495, sp: 440, stock: 12 },
  ];

  const coldDrinks = [
    { name: 'Coca-Cola', unit: '2 L', mrp: 100, sp: 88, stock: 72 },
    { name: 'Pepsi', unit: '2 L', mrp: 100, sp: 88, stock: 68 },
    { name: 'Sprite', unit: '2 L', mrp: 100, sp: 88, stock: 60 },
    { name: 'Thums Up', unit: '2 L', mrp: 100, sp: 88, stock: 55 },
    { name: 'Mountain Dew', unit: '2 L', mrp: 100, sp: 88, stock: 48 },
    { name: 'Fanta', unit: '750 ml', mrp: 48, sp: 40, stock: 50 },
    { name: 'Mirinda', unit: '750 ml', mrp: 48, sp: 40, stock: 45 },
    { name: '7UP', unit: '750 ml', mrp: 48, sp: 40, stock: 38 },
    { name: 'Coca-Cola Can', unit: '330 ml', mrp: 45, sp: 38, stock: 120 },
    { name: 'Pepsi Can', unit: '330 ml', mrp: 45, sp: 38, stock: 115 },
    { name: 'Thums Up Can', unit: '330 ml', mrp: 45, sp: 38, stock: 90 },
    { name: 'Red Bull', unit: '250 ml', mrp: 125, sp: 110, stock: 32 },
    { name: 'Sting Energy Drink', unit: '250 ml', mrp: 30, sp: 25, stock: 85 },
    { name: 'Bisleri Water', unit: '1 L', mrp: 22, sp: 18, stock: 200 },
    { name: 'Kinley Water', unit: '1 L', mrp: 22, sp: 18, stock: 180 },
    { name: 'Slice Mango Drink', unit: '1 L', mrp: 95, sp: 82, stock: 38 },
    { name: 'Maaza Mango Drink', unit: '1 L', mrp: 95, sp: 82, stock: 40 },
    { name: 'Real Fruit Juice Mixed', unit: '1 L', mrp: 130, sp: 115, stock: 28 },
    { name: 'Tropicana Orange Juice', unit: '1 L', mrp: 145, sp: 128, stock: 32 },
    { name: 'Paper Boat Aam Panna', unit: '500 ml', mrp: 35, sp: 30, stock: 50 },
    { name: 'Paper Boat Jamun Kanji', unit: '500 ml', mrp: 35, sp: 30, stock: 45 },
    { name: 'Paper Boat Jaljeera', unit: '500 ml', mrp: 35, sp: 30, stock: 40 },
    { name: 'Bournvita Health Drink', unit: '500 g', mrp: 280, sp: 252, stock: 25 },
    { name: 'Horlicks Health Drink', unit: '500 g', mrp: 265, sp: 238, stock: 30 },
    { name: 'Complan Health Drink', unit: '500 g', mrp: 290, sp: 260, stock: 20 },
  ];

  const products = [];
  ration.forEach((item, i) => {
    products.push({
      name: item.name, category: 'Daily Ration', unit: item.unit,
      mrp: item.mrp, sellingPrice: item.sp, stock: item.stock,
      isAvailable: true, isFeatured: i < 8,
      tags: ['ration', 'grocery', item.name.toLowerCase().split(' ')[0]],
      description: `Premium quality ${item.name} - ${item.unit}`
    });
  });
  coldDrinks.forEach((item, i) => {
    products.push({
      name: item.name, category: 'Cold Drinks', unit: item.unit,
      mrp: item.mrp, sellingPrice: item.sp, stock: item.stock,
      isAvailable: true, isFeatured: i < 8,
      tags: ['cold-drink', 'beverage', item.name.toLowerCase().split(' ')[0]],
      description: `Chilled ${item.name} - ${item.unit}`
    });
  });

  await Product.create(products);
  console.log(`${products.length} products seeded`);

  await mongoose.disconnect();
  console.log('Seed complete!');
})();
