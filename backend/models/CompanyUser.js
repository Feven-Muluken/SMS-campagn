const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class CompanyUser extends Model {}

CompanyUser.init(
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
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'user_id',
    },
    role: {
      type: DataTypes.ENUM('admin', 'staff', 'viewer'),
      allowNull: false,
      defaultValue: 'viewer',
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    sequelize,
    modelName: 'CompanyUser',
    tableName: 'company_users',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['company_id', 'user_id'],
        name: 'company_user_unique_idx',
      },
    ],
  }
);

module.exports = CompanyUser;