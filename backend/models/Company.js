const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Company extends Model {}

Company.init(
	{
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},
		name: {
			type: DataTypes.STRING(160),
			allowNull: false,
			unique: true,
		},
		slug: {
			type: DataTypes.STRING(120),
			allowNull: false,
			unique: true,
		},
		plan: {
			type: DataTypes.ENUM('starter', 'growth', 'enterprise'),
			allowNull: false,
			defaultValue: 'starter',
		},
		status: {
			type: DataTypes.ENUM('trial', 'active', 'suspended'),
			allowNull: false,
			defaultValue: 'trial',
		},
		contactEmail: {
			type: DataTypes.STRING(150),
			allowNull: true,
		},
		contactPhone: {
			type: DataTypes.STRING(32),
			allowNull: true,
		},
		timezone: {
			type: DataTypes.STRING(80),
			allowNull: false,
			defaultValue: 'Africa/Addis_Ababa',
		},
		createdById: {
			type: DataTypes.INTEGER,
			allowNull: true,
			field: 'created_by_id',
		},
		permissions: {
			type: DataTypes.JSON,
			allowNull: false,
			defaultValue: [],
		},
	},
	{
		sequelize,
		modelName: 'Company',
		tableName: 'companies',
		timestamps: true,
		underscored: true,
	}
);

module.exports = Company;
