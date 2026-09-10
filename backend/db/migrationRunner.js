const fs = require('fs');
const path = require('path');
const { DataTypes, QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const migrationsDirectory = path.join(__dirname, '..', 'migrations');
const lockName = 'messagehub_database_migrations';

const migrationFiles = () => fs.readdirSync(migrationsDirectory)
  .filter((name) => /^\d{14}[-_].+\.js$/.test(name))
  .sort();

const ensureMetadataTable = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
};

const appliedMigrationNames = async () => {
  await ensureMetadataTable();
  const rows = await sequelize.query(
    'SELECT name FROM schema_migrations ORDER BY name',
    { type: QueryTypes.SELECT },
  );
  return new Set(rows.map((row) => row.name));
};

const pendingMigrationNames = async () => {
  const applied = await appliedMigrationNames();
  return migrationFiles().filter((name) => !applied.has(name));
};

const acquireLock = async () => {
  const rows = await sequelize.query(
    'SELECT GET_LOCK(:name, 30) AS acquired',
    { replacements: { name: lockName }, type: QueryTypes.SELECT },
  );
  if (Number(rows[0]?.acquired) !== 1) {
    throw new Error('Could not acquire the database migration lock');
  }
};

const releaseLock = async () => {
  await sequelize.query('SELECT RELEASE_LOCK(:name)', {
    replacements: { name: lockName },
    type: QueryTypes.SELECT,
  });
};

const verifyModelColumns = async () => {
  const { sequelize: modelSequelize } = require('../models');
  const queryInterface = modelSequelize.getQueryInterface();
  const missing = [];
  for (const model of Object.values(modelSequelize.models)) {
    const table = model.getTableName();
    const tableName = typeof table === 'string' ? table : table.tableName;
    let description;
    try {
      description = await queryInterface.describeTable(tableName);
    } catch {
      missing.push(`${tableName} (table)`);
      continue;
    }
    for (const attribute of Object.values(model.rawAttributes)) {
      const column = attribute.field || attribute.fieldName;
      if (!description[column]) missing.push(`${tableName}.${column}`);
    }
  }
  if (missing.length) {
    throw new Error(`Database schema is missing: ${missing.join(', ')}`);
  }
};

const runMigrations = async () => {
  await sequelize.authenticate();
  await acquireLock();
  try {
    const applied = await appliedMigrationNames();
    for (const name of migrationFiles()) {
      if (applied.has(name)) continue;
      const migration = require(path.join(migrationsDirectory, name));
      if (typeof migration.up !== 'function') {
        throw new Error(`Migration ${name} does not export an up() function`);
      }
      console.log(`[migration] applying ${name}`);
      await migration.up({ sequelize, queryInterface: sequelize.getQueryInterface(), DataTypes });
      await verifyModelColumns();
      await sequelize.query('INSERT INTO schema_migrations (name) VALUES (:name)', {
        replacements: { name },
      });
      console.log(`[migration] applied ${name}`);
    }
  } finally {
    await releaseLock();
  }
};

const assertMigrationsCurrent = async () => {
  const pending = await pendingMigrationNames();
  if (pending.length) {
    throw new Error(
      `Database has pending migrations: ${pending.join(', ')}. Run npm run db:migrate before starting the API.`,
    );
  }
  await verifyModelColumns();
};

module.exports = { assertMigrationsCurrent, migrationFiles, pendingMigrationNames, runMigrations };
