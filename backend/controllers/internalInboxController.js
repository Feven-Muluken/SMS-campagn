const { InternalConversation, InternalMessage, Company, CompanyUser, User } = require('../models');
const { Op } = require('sequelize');

const isPlatformUser = (user) => user?.accountScope === 'platform';

const canMessage = (sender, recipient) =>
  recipient && Number(sender?.id) !== Number(recipient.id);

const isParticipant = (user, thread) =>
  Number(thread.createdById) === Number(user.id) ||
  Number(thread.recipientUserId) === Number(user.id);

const threadInclude = [
  { model: Company, as: 'company', attributes: ['name'] },
  {
    model: User,
    as: 'creator',
    attributes: ['id', 'name', 'email', 'role', 'accountScope'],
    include: [{ model: CompanyUser, as: 'companyMemberships', attributes: ['role'], required: false,
      include: [{ model: Company, as: 'company', attributes: ['id', 'name'], required: false }] }],
  },
  {
    model: User,
    as: 'recipient',
    attributes: ['id', 'name', 'email', 'role', 'accountScope'],
    include: [{ model: CompanyUser, as: 'companyMemberships', attributes: ['role'], required: false,
      include: [{ model: Company, as: 'company', attributes: ['id', 'name'], required: false }] }],
  },
];

const serializeThread = async (thread, viewerId) => {
  const lastMessage = await InternalMessage.findOne({
    where: { conversationId: thread.id },
    include: [{ model: User, as: 'sender', attributes: ['name'] }],
    order: [['createdAt', 'DESC']],
  });
  const unreadCount = await InternalMessage.count({
    where: {
      conversationId: thread.id,
      senderId: { [Op.ne]: viewerId },
      readAt: null,
    },
  });
  return { ...thread.toJSON(), lastMessage, unreadCount };
};

const listInternalConversations = async (req, res) => {
  try {
    const where = { [Op.or]: [{ createdById: req.user.id }, { recipientUserId: req.user.id }] };
    const status = String(req.query?.status || 'active').toLowerCase();
    if (status === 'archived') where.status = 'archived';
    else if (['open', 'resolved'].includes(status)) where.status = status;
    else if (status !== 'all') where.status = { [Op.ne]: 'archived' };
    const rows = await InternalConversation.findAll({
      where,
      include: threadInclude,
      order: [['lastMessageAt', 'DESC'], ['createdAt', 'DESC']],
    });
    return res.json({ data: await Promise.all(rows.map((row) => serializeThread(row, req.user.id))) });
  } catch (error) {
    console.error('Internal inbox list error:', error);
    return res.status(500).json({ message: 'Failed to load internal inbox' });
  }
};

const listInternalRecipients = async (req, res) => {
  try {
    const userWhere = {
      id: { [Op.ne]: req.user.id },
    };
    const users = await User.findAll({
      where: userWhere,
      attributes: ['id', 'name', 'email', 'role', 'accountScope'],
      include: [{
        model: CompanyUser,
        as: 'companyMemberships',
        attributes: ['companyId', 'role'],
        required: false,
        include: [{ model: Company, as: 'company', attributes: ['id', 'name'], required: false }],
      }],
      order: [['name', 'ASC']],
    });
    const data = [];
    for (const user of users) {
      const memberships = user.companyMemberships || [];
      for (const membership of memberships) {
        data.push({ id: user.id, name: user.name, email: user.email, role: membership.role,
          accountScope: 'tenant', companyId: membership.companyId,
          companyName: membership.company?.name || 'Company' });
      }
      if (!memberships.length && user.accountScope === 'platform') {
        data.push({ id: user.id, name: user.name, email: user.email, role: user.role,
          accountScope: 'platform', companyId: null, companyName: 'Platform' });
      }
    }
    return res.json({ data });
  } catch (error) {
    console.error('Internal recipient list error:', error);
    return res.status(500).json({ message: 'Failed to load chat recipients' });
  }
};

const createInternalConversation = async (req, res) => {
  try {
    const recipientUserId = Number(req.body?.recipientUserId || 0);
    const recipient = await User.findByPk(recipientUserId);
    if (!canMessage(req.user, recipient)) {
      return res.status(400).json({ message: 'Select another user to receive this chat' });
    }
    const requestedCompanyId = Number(req.body?.companyId || 0) || null;
    let companyId = requestedCompanyId;
    if (companyId) {
      const relatedMembership = await CompanyUser.findOne({
        where: {
          companyId,
          userId: { [Op.in]: [req.user.id, recipient.id] },
        },
      });
      if (!relatedMembership) {
        return res.status(400).json({ message: 'The selected user does not belong to that company' });
      }
    } else if (!isPlatformUser(recipient)) {
      const membership = await CompanyUser.findOne({ where: { userId: recipient.id } });
      companyId = membership?.companyId || null;
    } else {
      companyId = Number(req.companyContext?.companyId || req.auth?.activeCompanyId || 0) || null;
    }
    const subject = String(req.body?.subject || 'Support').trim().slice(0, 160);
    const content = String(req.body?.message || '').trim();
    if (!content) return res.status(400).json({ message: 'Message is required' });
    if (content.length > 4000) return res.status(400).json({ message: 'Message cannot exceed 4000 characters' });
    if (companyId && !await Company.findByPk(companyId)) {
      return res.status(404).json({ message: 'Company not found' });
    }
    const thread = await InternalConversation.create({
      companyId,
      createdById: req.user.id,
      recipientUserId: recipient.id,
      subject: subject || 'Support',
      lastMessageAt: new Date(),
    });
    await InternalMessage.create({ conversationId: thread.id, senderId: req.user.id, content });
    const fresh = await InternalConversation.findByPk(thread.id, { include: threadInclude });
    return res.status(201).json({ data: await serializeThread(fresh, req.user.id) });
  } catch (error) {
    console.error('Internal inbox create error:', error);
    return res.status(500).json({ message: 'Failed to start internal conversation' });
  }
};

const getInternalMessages = async (req, res) => {
  try {
    const thread = await InternalConversation.findByPk(req.params.conversationId);
    if (!thread) return res.status(404).json({ message: 'Conversation not found' });
    if (!isParticipant(req.user, thread)) return res.status(403).json({ message: 'This private chat is not yours' });
    await InternalMessage.update(
      { readAt: new Date() },
      {
        where: {
          conversationId: thread.id,
          senderId: { [Op.ne]: req.user.id },
          readAt: null,
        },
      },
    );
    const rows = await InternalMessage.findAll({
      where: { conversationId: thread.id },
      include: [{ model: User, as: 'sender', attributes: ['name'] }],
      order: [['createdAt', 'ASC']],
    });
    return res.json({ data: rows });
  } catch (error) {
    console.error('Internal inbox messages error:', error);
    return res.status(500).json({ message: 'Failed to load internal messages' });
  }
};

const sendInternalMessage = async (req, res) => {
  try {
    const thread = await InternalConversation.findByPk(req.params.conversationId);
    const content = String(req.body?.message || '').trim();
    if (!thread) return res.status(404).json({ message: 'Conversation not found' });
    if (!content) return res.status(400).json({ message: 'Write a message first' });
    if (content.length > 4000) return res.status(400).json({ message: 'Message cannot exceed 4000 characters' });
    if (!isParticipant(req.user, thread)) return res.status(403).json({ message: 'This private chat is not yours' });
    const message = await InternalMessage.create({
      conversationId: thread.id,
      senderId: req.user.id,
      content,
    });
    await thread.update({ lastMessageAt: new Date(), status: 'open' });
    const fresh = await InternalMessage.findByPk(message.id, {
      include: [{ model: User, as: 'sender', attributes: ['name'] }],
    });
    return res.status(201).json({ data: fresh });
  } catch (error) {
    console.error('Internal inbox send error:', error);
    return res.status(500).json({ message: 'Failed to send internal message' });
  }
};

const updateInternalConversation = async (req, res) => {
  try {
    const thread = await InternalConversation.findByPk(req.params.conversationId);
    if (!thread) return res.status(404).json({ message: 'Conversation not found' });
    if (!isParticipant(req.user, thread)) return res.status(403).json({ message: 'This private chat is not yours' });
    if (!['open', 'resolved', 'archived'].includes(req.body?.status)) {
      return res.status(400).json({ message: 'Select a valid conversation status' });
    }
    await thread.update({ status: req.body.status });
    const fresh = await InternalConversation.findByPk(thread.id, { include: threadInclude });
    return res.json({ data: await serializeThread(fresh, req.user.id) });
  } catch (error) {
    console.error('Internal inbox update error:', error);
    return res.status(500).json({ message: 'Failed to update internal conversation' });
  }
};

const deleteInternalConversation = async (req, res) => {
  try {
    const thread = await InternalConversation.findByPk(req.params.conversationId);
    if (!thread) return res.status(404).json({ message: 'Conversation not found' });
    if (!isParticipant(req.user, thread)) return res.status(403).json({ message: 'This private chat is not yours' });
    await InternalMessage.destroy({ where: { conversationId: thread.id } });
    await thread.destroy();
    return res.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('Internal inbox delete error:', error);
    return res.status(500).json({ message: 'Failed to delete internal conversation' });
  }
};

module.exports = {
  listInternalConversations,
  listInternalRecipients,
  createInternalConversation,
  getInternalMessages,
  sendInternalMessage,
  updateInternalConversation,
  deleteInternalConversation,
};
