const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class CompanySenderId extends Model {}

CompanySenderId.init(
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
		senderId: {
			type: DataTypes.STRING(20),
			allowNull: false,
			field: 'sender_id',
		},
		status: {
			type: DataTypes.ENUM('pending', 'approved', 'rejected'),
			allowNull: false,
			defaultValue: 'approved',
		},
		isActive: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: true,
			field: 'is_active',
		},
		approvedById: {
			type: DataTypes.INTEGER,
			allowNull: true,
			field: 'approved_by_id',
		},
	},
	{
		sequelize,
		modelName: 'CompanySenderId',
		tableName: 'company_sender_ids',
		timestamps: true,
		underscored: true,
		indexes: [
			{
				unique: true,
				fields: ['company_id', 'sender_id'],
				name: 'company_sender_unique_idx',
			},
		],
	}
);

module.exports = CompanySenderId;
