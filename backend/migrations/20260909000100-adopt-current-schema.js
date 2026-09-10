// Safely adopts both existing installations and empty databases. Future schema
// changes must be added as new, explicitly ordered migration files.
module.exports = {
  async up({ sequelize }) {
    require('../models');
    await sequelize.sync({ alter: false });
    const { ensureDbColumns } = require('../config/ensureDbColumns');
    await ensureDbColumns();
  },
};
