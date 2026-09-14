const { Sequelize } = require('sequelize');
const fs = require('fs');

const readSslCa = () => {
  if (process.env.DB_SSL_CA_PATH) {
    return fs.readFileSync(process.env.DB_SSL_CA_PATH, 'utf8');
  }
  return String(process.env.DB_SSL_CA || '').replace(/\\n/g, '\n').trim() || undefined;
};

const sslCa = readSslCa();
const sslEnabled = String(process.env.DB_SSL || '').toLowerCase() === 'true' || Boolean(sslCa);

// Central Sequelize instance shared by all models
const sequelize = new Sequelize({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  database: process.env.DB_NAME || 'sms_campaign',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  dialect: process.env.DB_DIALECT || 'mysql',
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  timezone: '+00:00',
  pool: {
    max: Number(process.env.DB_POOL_MAX) || 10,
    min: 0,
    acquire: Number(process.env.DB_POOL_ACQUIRE_MS) || 60000,
    idle: 10000,
  },
  dialectOptions: {
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 15000,
    ...(sslEnabled ? {
      ssl: {
        ...(sslCa ? { ca: sslCa } : {}),
        rejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'true').toLowerCase() !== 'false',
      },
    } : {}),
  },
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('MySQL connection established');
  } catch (error) {
    console.log('Dialect:', process.env.DB_DIALECT);
    console.error('MySQL connection error:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
