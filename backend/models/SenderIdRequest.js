const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class SenderIdRequest extends Model {}

SenderIdRequest.init(
	{
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},
		companyId: {
			type: DataTypes.INTEGER,
			allowNull: false,
			field: 'company_id',
		},
		requestedById: {
			type: DataTypes.INTEGER,
			allowNull: false,
			field: 'requested_by_id',
		},
		senderId: {
			type: DataTypes.STRING(20),
			allowNull: false,
			field: 'sender_id',
		},
		countryCodes: {
			type: DataTypes.JSON,
			allowNull: false,
			defaultValue: [],
			field: 'country_codes',
		},
		status: {
			type: DataTypes.ENUM('pending', 'approved', 'rejected'),
			allowNull: false,
			defaultValue: 'pending',
		},
		reason: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		reviewedById: {
			type: DataTypes.INTEGER,
			allowNull: true,
			field: 'reviewed_by_id',
		},
		reviewedAt: {
			type: DataTypes.DATE,
			allowNull: true,
			field: 'reviewed_at',
		},
	},
	{
		sequelize,
		modelName: 'SenderIdRequest',
		tableName: 'sender_id_requests',
		timestamps: true,
		underscored: true,
		indexes: [
			{
				fields: ['company_id', 'sender_id', 'status'],
				name: 'sender_id_requests_company_sender_status_idx',
			},
		],
	}
);

module.exports = SenderIdRequest;
