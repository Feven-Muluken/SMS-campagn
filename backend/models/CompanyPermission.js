const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class CompanyPermission extends Model {}

CompanyPermission.init(
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
		permissionKey: {
			type: DataTypes.STRING(80),
			allowNull: false,
			field: 'permission_key',
		},
		isEnabled: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
			field: 'is_enabled',
		},
		config: {
			type: DataTypes.JSON,
			allowNull: false,
			defaultValue: {},
		},
		grantedById: {
			type: DataTypes.INTEGER,
			allowNull: true,
			field: 'granted_by_id',
		},
	},
	{
		sequelize,
		modelName: 'CompanyPermission',
		tableName: 'company_permissions',
		timestamps: true,
		underscored: true,
		indexes: [
			{
				unique: true,
				fields: ['company_id', 'permission_key'],
				name: 'company_permission_unique_idx',
			},
		],
	}
);

module.exports = CompanyPermission;
