const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./models/User');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  const hashedPassword = await bcrypt.hash('admin', 10);
  const admin = new User({
    name: 'Toto',
    email: 'mdouyassine2002@gmail.com',
    password: hashedPassword,
    role: 'admin',
    isApproved: true
  });
  await admin.save();
  console.log('Admin créé');
  process.exit();
}

seed();