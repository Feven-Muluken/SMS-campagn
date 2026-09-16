const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');

dotenv.config();

const { validateProductionConfig } = require('./config/validateProductionConfig');
validateProductionConfig();

const { connectDB } = require('./config/db');
const { syncDatabase } = require('./models');
const { assertMigrationsCurrent } = require('./db/migrationRunner');

const app = express();
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback');
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || '1mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.REQUEST_BODY_LIMIT || '1mb' }));

const allowedOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.get('Origin')?.trim().replace(/\/+$/, '');
  if (!origin || !allowedOrigins.includes(origin)) return next();

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,X-Company-Id');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

app.get('/', (req, res) => {
  res.send('MessageHub API is running ... ');
});

app.get('/health', (req, res) => {
  const sms = describeActiveProvider();
  res.json({
    ok: true,
    service: 'messagehub-api',
    timestamp: new Date().toISOString(),
    sms: {
      default: sms.default,
      available: sms.available,
      configured: sms.configured,
      userSelectable: sms.userSelectable,
    },
  });
});

const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const smsRoutes = require('./routes/smsRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');
const groupRoutes = require('./routes/groupRoutes');
const campaignRoutes = require('./routes/campaignRoutes')
const contactRoutes = require('./routes/contactRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const companyRoutes = require('./routes/companyRoutes');
const companyPermissionRoutes = require('./routes/companyPermissionRoutes');
const senderIdRequestRoutes = require('./routes/senderIdRequestRoutes');
const { startAppointmentScheduler } = require('./services/appointmentNotificationService');
const { startCampaignScheduler } = require('./services/campaignSchedulerService');
const { describeActiveProvider } = require('./services/smsService');

app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/sms', smsRoutes);
app.use('/groups', groupRoutes);
app.use('/campaign', campaignRoutes)
app.use('/contacts', contactRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/companies', companyRoutes);
app.use('/company-permissions', companyPermissionRoutes);
app.use('/sender-id-requests', senderIdRequestRoutes);
app.use(errorMiddleware);

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
  try {
    await connectDB();
    if (process.env.NODE_ENV === 'production') {
      await assertMigrationsCurrent();
    } else {
      await syncDatabase();
    }
    startAppointmentScheduler();
    startCampaignScheduler();
    app.listen(PORT, HOST, () => {
      const sms = describeActiveProvider();
      console.log(`Server listening on http://${HOST}:${PORT}`);
      console.log(`SMS provider: ${sms.default} (${sms.routing}${sms.userSelectable ? ', user-selectable' : ''})`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

if (require.main === module) startServer();

module.exports = app;
