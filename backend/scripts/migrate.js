require('dotenv').config();

const { sequelize } = require('../config/db');
const { runMigrations } = require('../db/migrationRunner');

runMigrations()
  .then(() => console.log('Database migrations are current'))
  .catch((error) => {
    console.error('Database migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => sequelize.close());
