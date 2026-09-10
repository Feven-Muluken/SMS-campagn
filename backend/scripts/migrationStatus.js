require('dotenv').config();

const { sequelize } = require('../config/db');
const { migrationFiles, pendingMigrationNames } = require('../db/migrationRunner');

(async () => {
  try {
    await sequelize.authenticate();
    const pending = new Set(await pendingMigrationNames());
    for (const name of migrationFiles()) {
      console.log(`${pending.has(name) ? 'pending' : 'applied'}  ${name}`);
    }
    if (pending.size) process.exitCode = 2;
  } catch (error) {
    console.error('Could not read migration status:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
