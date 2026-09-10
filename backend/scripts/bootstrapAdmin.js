require('dotenv').config();

const { sequelize, User, syncDatabase } = require('../models');

const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const createFirstAdmin = async ({
  name = process.env.BOOTSTRAP_ADMIN_NAME,
  email = process.env.BOOTSTRAP_ADMIN_EMAIL,
  password = process.env.BOOTSTRAP_ADMIN_PASSWORD,
} = {}) => {
  name = String(name || '').trim();
  email = String(email || '').trim().toLowerCase();
  password = String(password || '');

  if (!name || !validEmail(email) || password.length < 12) {
    throw new Error(
      'Set BOOTSTRAP_ADMIN_NAME, a valid BOOTSTRAP_ADMIN_EMAIL, and BOOTSTRAP_ADMIN_PASSWORD (minimum 12 characters).'
    );
  }

  await sequelize.authenticate();
  await syncDatabase();

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new Error(`A user with ${email} already exists; no changes were made.`);
  }

  const admin = await User.create({
    name,
    email,
    password,
    role: 'admin',
    accountScope: 'platform',
  });
  console.log(`Created platform administrator ${admin.email} (id=${admin.id}).`);
  return admin;
};

if (require.main === module) {
  createFirstAdmin()
    .catch((error) => {
      console.error(error.message || error);
      process.exitCode = 1;
    })
    .finally(() => sequelize.close());
}

module.exports = { createFirstAdmin };
