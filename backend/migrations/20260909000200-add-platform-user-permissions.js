const ROLE_DEFAULTS = {
  admin: ['dashboard.view','campaign.view','campaign.create','campaign.manage','campaign.schedule','campaign.send','contact.view','contact.create','contact.manage','contact.send','group.view','group.create','group.manage','group.send','user.manage','sms.send','delivery.view','appointment.view','appointment.manage','inbox.view','inbox.reply','inbox.assign','inbox.status','geo.send','billing.send','company.manage'],
  staff: ['dashboard.view','campaign.view','campaign.create','campaign.manage','campaign.schedule','campaign.send','contact.view','contact.create','contact.manage','contact.send','group.view','group.create','group.manage','group.send','sms.send','delivery.view','appointment.view','appointment.manage','inbox.view','inbox.reply','inbox.status','geo.send','billing.send'],
  viewer: ['dashboard.view','campaign.view','contact.view','group.view','delivery.view','appointment.view','inbox.view'],
};

module.exports = {
  async up({ queryInterface, DataTypes, sequelize }) {
    const users = await queryInterface.describeTable('users');
    if (!users.permissions) {
      await queryInterface.addColumn('users', 'permissions', {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      });
    }

    for (const [role, permissions] of Object.entries(ROLE_DEFAULTS)) {
      await sequelize.query(
        `UPDATE users SET permissions = :permissions
         WHERE account_scope = 'platform' AND role = :role
           AND (permissions IS NULL OR JSON_LENGTH(permissions) = 0)`,
        { replacements: { role, permissions: JSON.stringify(permissions) } },
      );
    }

    // Existing company memberships previously used an empty array to mean the
    // role default. Materialize that default so an empty array can now mean no access.
    for (const [role, permissions] of Object.entries(ROLE_DEFAULTS)) {
      await sequelize.query(
        `UPDATE company_users SET permissions = :permissions
         WHERE role = :role AND (permissions IS NULL OR JSON_LENGTH(permissions) = 0)`,
        { replacements: { role, permissions: JSON.stringify(permissions) } },
      );
    }
  },
};
