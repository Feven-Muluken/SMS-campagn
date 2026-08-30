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

	try {
		const contacts = await qi.describeTable('contacts');
		if (!contacts.company_id) {
			await qi.addColumn('contacts', 'company_id', {
				type: DataTypes.INTEGER,
				allowNull: true,
			});
		}
	} catch (error) {
		console.error('[db] ensure contacts.company_id failed:', error.message || error);
	}

	try {
		const companySenderIds = await qi.describeTable('company_sender_ids');
		if (!companySenderIds.country_codes) {
			await qi.addColumn('company_sender_ids', 'country_codes', {
				type: DataTypes.JSON,
				allowNull: false,
				defaultValue: [],
			});
		}
	} catch (error) {
		// company_sender_ids table may not exist in older snapshots; keep startup resilient.
		console.error('[db] ensure company_sender_ids columns failed:', error.message || error);
	}

	try {
		const senderIdRequests = await qi.describeTable('sender_id_requests');
		if (!senderIdRequests.country_codes) {
			await qi.addColumn('sender_id_requests', 'country_codes', {
				type: DataTypes.JSON,
				allowNull: false,
				defaultValue: [],
			});
		}
		if (!senderIdRequests.reason) {
			await qi.addColumn('sender_id_requests', 'reason', {
				type: DataTypes.STRING(255),
				allowNull: true,
			});
		}
		if (!senderIdRequests.reviewed_by_id) {
			await qi.addColumn('sender_id_requests', 'reviewed_by_id', {
				type: DataTypes.INTEGER,
				allowNull: true,
			});
		}
		if (!senderIdRequests.reviewed_at) {
			await qi.addColumn('sender_id_requests', 'reviewed_at', {
				type: DataTypes.DATE,
				allowNull: true,
			});
		}
	} catch (error) {
		// sender_id_requests table may not exist in older snapshots; keep startup resilient.
		console.error('[db] ensure sender_id_requests columns failed:', error.message || error);
	}

	try {
		const messages = await qi.describeTable('messages');
		if (!messages.provider) {
			await qi.addColumn('messages', 'provider', {
				type: DataTypes.ENUM('africastalking', 'mobilesms_io'),
				allowNull: true,
				defaultValue: 'africastalking',
			});
			console.log('[db] added messages.provider column');
		}
	} catch (error) {
		console.error('[db] ensure messages.provider failed:', error.message || error);
	}
};

module.exports = { ensureDbColumns };


// Walk through configuring MobileSMS.io webhooks step-by-step?  and use   and make it work in the website frontend ui to choose a sending api mobilesms/africans token  does it look great idea or there is other recomended way 




// and make the senderid to be saved in the backend and if approved change the buttons in the frontend and show approved button. and cancel/remove senderid button 