module.exports = {
  async up({ queryInterface, DataTypes, sequelize }) {
    const conversations = await queryInterface.describeTable('conversations');
    if (!conversations.owner_user_id) {
      await queryInterface.addColumn('conversations', 'owner_user_id', {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    // Preserve existing chats by assigning them to their assignee, most recent
    // sender, or the earliest company member. New chats always have an owner.
    await sequelize.query(`
      UPDATE conversations c
      SET c.owner_user_id = COALESCE(
        c.assigned_to_id,
        (SELECT m.sent_by_id FROM messages m
          WHERE m.conversation_id = c.id AND m.sent_by_id IS NOT NULL
          ORDER BY m.created_at DESC LIMIT 1),
        (SELECT cu.user_id FROM company_users cu
          WHERE cu.company_id = c.company_id ORDER BY cu.created_at ASC LIMIT 1)
      )
      WHERE c.owner_user_id IS NULL
    `);

    const indexes = await queryInterface.showIndex('conversations');
    if (!indexes.some((index) => index.name === 'conversation_owner_phone_idx')) {
      await queryInterface.addIndex('conversations', ['company_id', 'owner_user_id', 'customer_phone'], {
        name: 'conversation_owner_phone_idx',
      });
    }
  },
};
