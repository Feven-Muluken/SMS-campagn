const { Op } = require('sequelize');
const { User, Campaign, Message, Contact, Group } = require('../models');

const admin = async (req, res) => {
  res.send('Admin page');
};

const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 100);
    const search = (req.query.search || '').trim();
    const sortBy = ['name', 'email', 'role', 'created_at', 'createdAt'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'created_at';
    const sortDir = req.query.sortDir === 'ASC' ? 'ASC' : 'DESC';

    const ilike = Op.iLike || Op.like;
    const where = search
      ? {
          [Op.or]: [
            { name: { [ilike]: `%${search}%` } },
            { email: { [ilike]: `%${search}%` } },
            { role: { [ilike]: `%${search}%` } },
          ],
        }
      : {};

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [[sortBy, sortDir]],
    });

    res.json({
      data: rows,
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    console.error('Fetch users error: ', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, email, role, phoneNumber, password } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (email && email !== user.email) {
      const exists = await User.findOne({ where: { email, id: { [Op.ne]: user.id } } });
      if (exists) return res.status(400).json({ message: 'Email already taken' });
    }

    await user.update({
      name: name ?? user.name,
      email: email ?? user.email,
      role: role ?? user.role,
      phoneNumber: phoneNumber ?? user.phoneNumber,
      password: password ?? user.password,
    });

    const safeUser = user.toJSON();
    delete safeUser.password;
    res.json({ user: safeUser, message: 'User updated' });
  } catch (error) {
    console.error('Update user error: ', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

const deleteUser = async (req, res) => {
  try {
    const deleted = await User.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'User does not exist' });
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error: ', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const [userCount, contactCount, campaignCount, messageCount, groupCount] = await Promise.all([
      User.count(),
      Contact.count(),
      Campaign.count(),
      Message.count(),
      Group.count()
    ]);
    res.json({ userCount, contactCount, campaignCount, messageCount, groupCount });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const recentCampaigns = await Campaign.findAll({
      order: [['created_at', 'DESC']],
      limit: 10,
      include: [{ association: 'creator', attributes: ['id', 'name', 'email'] }],
    });

    const recentMessages = await Message.findAll({
      order: [['created_at', 'DESC']],
      limit: 10,
      include: [{ association: 'campaign', attributes: ['id', 'name'] }],
    });

    const contactIds = recentMessages.filter((m) => m.recipientType === 'Contact').map((m) => m.recipientId);
    const userIds = recentMessages.filter((m) => m.recipientType === 'User').map((m) => m.recipientId);

    const [contacts, users] = await Promise.all([
      contactIds.length ? Contact.findAll({ where: { id: contactIds } }) : [],
      userIds.length ? User.findAll({ where: { id: userIds }, attributes: { exclude: ['password'] } }) : [],
    ]);

    const contactsMap = Object.fromEntries(contacts.map((c) => [c.id, c]));
    const usersMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const formattedMessages = recentMessages.map((msg) => {
      const recipient = msg.recipientType === 'Contact' ? contactsMap[msg.recipientId] : usersMap[msg.recipientId];
      return {
        ...msg.toJSON(),
        recipient: recipient ? { id: recipient.id, name: recipient.name || recipient.email, phoneNumber: recipient.phoneNumber || null } : null,
      };
    });

    res.json({ recentCampaigns, recentMessages: formattedMessages });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ message: 'Failed to fetch recent activity' });
  }
};

module.exports = { admin, getAllUsers, updateUser, deleteUser, getDashboardStats, getRecentActivity };