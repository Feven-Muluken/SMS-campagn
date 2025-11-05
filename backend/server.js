const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('MessageHub API is running ... ');
});

const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const smsRoutes = require('./routes/smsRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');
const groupRoutes = require('./routes/groupRoutes');

app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/sms', smsRoutes);
app.use('/groups', groupRoutes);
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));