const User = require('../models/User');
const Campaign = require('../models/Campaign');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const Contact = require('../models/Contact');
const Group = require('../models/Group');

const admin = async (req, res) => {
  res.send("Admin page");
};
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Fetch users error: ', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUser = async (req, res, next) => {

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid user ID format' });
  }

  try {
    const updateUser = await User.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });

    if (!updateUser) return res.status(404).json({ message: 'User not found' });

    res.json({ updateUser, message: 'User updated' });
  } catch (error) {
    console.error('Update user error: ', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

const deleteUser = async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid user ID format' });
  }
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User does not exist' });

    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error: ', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// return total users, contacts, campaigns, messages
const getDashboardStats = async (req, res) => {
  try {
    const [userCount, contactCount, campaignCount, messageCount, groupCount] = await Promise.all([
      User.countDocuments(),
      Contact.countDocuments(),
      Campaign.countDocuments(),
      Message.countDocuments(),
      Group.countDocuments()
    ]);
    res.json({ userCount, contactCount, campaignCount, messageCount, groupCount });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};


const getRecentActivity = async (req, res) => {
  try {
    const recentCampaigns = await Campaign.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('createdBy', 'name email');

    const recentMessages = await Message.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('campaign', 'name')
      .populate('recipients');

    // Format messages to include recipient info
    const formattedMessages = recentMessages.map(msg => {
      const recipient = msg.recipients && msg.recipients.length > 0 ? msg.recipients[0] : null;
      return {
        ...msg.toObject(),
        recipient: recipient ? {
          _id: recipient._id,
          name: recipient.name || recipient.email || 'Unknown',
          phoneNumber: recipient.phoneNumber || null
        } : null
      };
    });

    res.json({ recentCampaigns, recentMessages: formattedMessages });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ message: 'Failed to fetch recent activity' });
  }
};

/*const getFieldMessages = //return messages with "failed" status */

module.exports = { admin, getAllUsers, updateUser, deleteUser, getDashboardStats, getRecentActivity }