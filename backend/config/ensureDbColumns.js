const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const ensureDbColumns = async () => {
	if (!sequelize) return;

	const qi = sequelize.getQueryInterface();

	try {
		await qi.changeColumn('internal_conversations', 'company_id', {
			type: DataTypes.INTEGER,
			allowNull: true,
		});
	} catch (error) {
		console.error('[db] allow platform internal conversations failed:', error.message || error);
	}

	try {
		await qi.changeColumn('campaigns', 'status', {
			type: DataTypes.ENUM('pending', 'sent', 'partial', 'failed', 'paused', 'cancelled'),
			allowNull: false,
			defaultValue: 'pending',
		});
	} catch (error) {
		console.error('[db] ensure campaigns.status values failed:', error.message || error);
	}

	try {
		await qi.changeColumn('campaign_dispatches', 'status', {
			type: DataTypes.ENUM('pending', 'sent', 'partial', 'failed'),
			allowNull: false,
			defaultValue: 'pending',
		});
	} catch (error) {
		console.error('[db] ensure campaign_dispatches.status values failed:', error.message || error);
	}

	try {
		const campaigns = await qi.describeTable('campaigns');
		if (!campaigns.company_id) {
			await qi.addColumn('campaigns', 'company_id', {
				type: DataTypes.INTEGER,
				allowNull: true,
			});
			console.log('[db] added campaigns.company_id column');
		}
		if (!campaigns.recurrence_end_at) {
			await qi.addColumn('campaigns', 'recurrence_end_at', {
				type: DataTypes.DATE,
				allowNull: true,
			});
			console.log('[db] added campaigns.recurrence_end_at column');
		}
	} catch (error) {
		console.error('[db] ensure campaigns.recurrence_end_at failed:', error.message || error);
	}

	try {
		const users = await qi.describeTable('users');
		if (!users.account_scope) {
			await qi.addColumn('users', 'account_scope', {
				type: DataTypes.ENUM('platform', 'tenant'),
				allowNull: false,
				defaultValue: 'platform',
			});
		}
		if (!users.created_by_id) {
			await qi.addColumn('users', 'created_by_id', {
				type: DataTypes.INTEGER,
				allowNull: true,
			});
		}
		if (!users.password_reset_nonce) {
			await qi.addColumn('users', 'password_reset_nonce', {
				type: DataTypes.STRING(64),
				allowNull: true,
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
		const groups = await qi.describeTable('groups');
		if (!groups.company_id) {
			await qi.addColumn('groups', 'company_id', {
				type: DataTypes.INTEGER.UNSIGNED,
				allowNull: true,
			});
			await qi.addIndex('groups', ['company_id'], { name: 'groups_company_id_idx' });
			console.log('[db] added groups.company_id column');
		}
	} catch (error) {
		console.error('[db] ensure groups.company_id failed:', error.message || error);
	}

	try {
		const appointments = await qi.describeTable('appointments');
		if (!appointments.company_id) {
			await qi.addColumn('appointments', 'company_id', {
				type: DataTypes.INTEGER.UNSIGNED,
				allowNull: true,
			});
			await qi.addIndex('appointments', ['company_id', 'scheduled_at'], {
				name: 'appointments_company_schedule_idx',
			});
			console.log('[db] added appointments.company_id column');
		}
	} catch (error) {
		console.error('[db] ensure appointments.company_id failed:', error.message || error);
	}

	try {
		const indexes = await qi.showIndex('contacts');
		for (const index of indexes) {
			const fields = (index.fields || []).map((field) => field.attribute || field.name);
			if (index.unique && fields.length === 1 && fields[0] === 'phone_number') {
				await qi.removeIndex('contacts', index.name);
			}
		}
		const refreshed = await qi.showIndex('contacts');
		if (!refreshed.some((index) => index.name === 'contacts_company_phone_unique_idx')) {
			await qi.addIndex('contacts', ['company_id', 'phone_number'], {
				unique: true,
				name: 'contacts_company_phone_unique_idx',
			});
		}
	} catch (error) {
		console.error('[db] ensure company contact uniqueness failed:', error.message || error);
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
		const internalConversations = await qi.describeTable('internal_conversations');
		if (!internalConversations.recipient_user_id) {
			await qi.addColumn('internal_conversations', 'recipient_user_id', {
				type: DataTypes.INTEGER.UNSIGNED,
				allowNull: true,
			});
			await qi.addIndex('internal_conversations', ['recipient_user_id'], {
				name: 'internal_conversation_recipient_idx',
			});
		}
	} catch (error) {
		// The table is created by Sequelize on fresh installations.
		if (!/doesn't exist|unknown table/i.test(String(error.message || error))) {
			console.error('[db] ensure internal conversation columns failed:', error.message || error);
		}
	}

	try {
		const internalMessages = await qi.describeTable('internal_messages');
		if (!internalMessages.read_at) {
			await qi.addColumn('internal_messages', 'read_at', {
				type: DataTypes.DATE,
				allowNull: true,
			});
		}
	} catch (error) {
		if (!/doesn't exist|unknown table/i.test(String(error.message || error))) {
			console.error('[db] ensure internal message columns failed:', error.message || error);
		}
	}

	try {
		const messages = await qi.describeTable('messages');
		if (!messages.conversation_id) {
			await qi.addColumn('messages', 'conversation_id', { type: DataTypes.INTEGER, allowNull: true });
			await qi.addIndex('messages', ['conversation_id', 'created_at'], { name: 'messages_conversation_time_idx' });
		}
		if (!messages.sent_by_id) {
			await qi.addColumn('messages', 'sent_by_id', { type: DataTypes.INTEGER, allowNull: true });
		}
		if (!messages.delivered_at) {
			await qi.addColumn('messages', 'delivered_at', { type: DataTypes.DATE, allowNull: true });
		}
		if (!messages.failed_at) {
			await qi.addColumn('messages', 'failed_at', { type: DataTypes.DATE, allowNull: true });
		}
		if (!messages.company_id) {
			await qi.addColumn('messages', 'company_id', {
				type: DataTypes.INTEGER,
				allowNull: true,
			});
			await qi.addIndex('messages', ['company_id'], {
				name: 'messages_company_id_idx',
			});
			console.log('[db] added messages.company_id column');
		}
		if (!messages.provider) {
			await qi.addColumn('messages', 'provider', {
				type: DataTypes.ENUM('africastalking', 'mobilesms_io'),
				allowNull: true,
				defaultValue: 'africastalking',
			});
			console.log('[db] added messages.provider column');
		}
		if (!messages.provider_message_id) {
			await qi.addColumn('messages', 'provider_message_id', {
				type: DataTypes.STRING(96),
				allowNull: true,
			});
			await qi.addIndex('messages', ['provider_message_id'], {
				name: 'messages_provider_message_id_idx',
			});
			console.log('[db] added messages.provider_message_id column');
		}
		if (!messages.network_delivery_status) {
			await qi.addColumn('messages', 'network_delivery_status', {
				type: DataTypes.STRING(32),
				allowNull: true,
			});
			console.log('[db] added messages.network_delivery_status column');
		}
		if (!messages.channel) {
			await qi.addColumn('messages', 'channel', {
				type: DataTypes.STRING(24),
				allowNull: true,
			});
			await qi.addIndex('messages', ['company_id', 'channel'], {
				name: 'messages_company_channel_idx',
			});
			console.log('[db] added messages.channel column');
		}
	} catch (error) {
		console.error('[db] ensure message delivery columns failed:', error.message || error);
	}

	try {
		await qi.changeColumn('messages', 'status', {
			type: DataTypes.ENUM('pending', 'sent', 'delivered', 'failed'),
			allowNull: false,
			defaultValue: 'pending',
		});
	} catch (error) {
		console.error('[db] ensure messages.status values failed:', error.message || error);
	}
};

module.exports = { ensureDbColumns };






