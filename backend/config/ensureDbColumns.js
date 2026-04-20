const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const ensureDbColumns = async () => {
	if (!sequelize) return;

	const qi = sequelize.getQueryInterface();

	try {
		const users = await qi.describeTable('users');
		if (!users.account_scope) {
			await qi.addColumn('users', 'account_scope', {
				type: DataTypes.ENUM('platform', 'tenant'),
				allowNull: false,
				defaultValue: 'platform',
			});
		}
	} catch (error) {
		console.error('[db] ensure users.account_scope failed:', error.message || error);
	}

	try {
		const companies = await qi.describeTable('companies');
		if (!companies.created_by_id) {
			await qi.addColumn('companies', 'created_by_id', {
				type: DataTypes.INTEGER,
				allowNull: true,
			});
		}
	} catch (error) {
		// companies table may not exist in older snapshots; keep startup resilient.
		console.error('[db] ensure companies.created_by_id failed:', error.message || error);
	}
};

module.exports = { ensureDbColumns };
