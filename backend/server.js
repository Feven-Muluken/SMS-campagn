const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const { connectDB } = require('./config/db');
const { syncDatabase } = require('./models');

const app = express();
app.use(express.json());

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);

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
const appointmentRoutes = require('./routes/appointmentRoutes');
const { startAppointmentScheduler } = require('./services/appointmentNotificationService');
const { startCampaignScheduler } = require('./services/campaignSchedulerService');

app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/sms', smsRoutes);
app.use('/groups', groupRoutes);
app.use('/campaign', campaignRoutes)
app.use('/contacts', contactRoutes);
app.use('/appointments', appointmentRoutes);
app.use(errorMiddleware);

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await syncDatabase();
    startAppointmentScheduler();
    startCampaignScheduler();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();