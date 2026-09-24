const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const bugRoutes = require('./routes/bugRoutes');
const { protect } = require('./middleware/auth');
require('dotenv').config();

const app = express();
//debut


app.use('/api/auth', authRoutes);
app.use('/api/bugs', protect, bugRoutes);
//fin
app.use(cors());
app.use(express.json());

app.use('/api/bugs', bugRoutes);

app.get('/', (req, res) => {
  res.send('Bug Tracker API is running');
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));