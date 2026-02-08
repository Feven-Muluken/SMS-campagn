const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const { connectDB } = require('./config/db');
const { syncDatabase } = require('./models');

const app = express();
app.use(express.json());

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
})); 

app.get('/', (req, res) => {
  res.send('MessageHub API is running ... ');
});

const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const smsRoutes = require('./routes/smsRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');
const groupRoutes = require('./routes/groupRoutes');
const campaignRoutes = require('./routes/campaignRoutes')
const contactRoutes = require('./routes/contactRoutes');

app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/sms', smsRoutes);
app.use('/groups', groupRoutes);
app.use('/campaign', campaignRoutes)
app.use('/contacts', contactRoutes);
app.use(errorMiddleware);

const PORT = process.env.PORT;

const startServer = async () => {
  await connectDB();
  await syncDatabase();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer();