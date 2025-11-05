const User =require('../models/User');
const Campaign = require('../models/Campaign');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const Contact = require('../models/Contact');


const admin = async (req, res) => {
  res.send("Admin page");
};
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  }catch (error) {
    console.error('Fetch users error: ', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUser = async (req, res, next) => {

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) { return res.status(400).json({ message: 'Invalid user ID format' });
  }

  try{
    const updateUser = await User.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });

    if (!updateUser) return res.status(404).json({ message: 'User not found' });

    res.json({ updateUser, message: 'User updated' });
  } catch (error) {
    console.error('Update user error: ', error);
    res.status(500).json({ message: 'Server error', error });
    res.json(error);
    next();
  }
};

const deleteUser =  async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
  try{
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ Message: 'User does not exist' });

    res.json({ message: ' User deleted' });
  } catch (error) {
    console.error('Delete user error: ', error);
    res.status(500).json({  message: 'Server error' });
    next();
  }
};

// return total users, contacts, campagns, messages
const getDashboardStats = async (req, res) => {
  const [userCount, contactCount, campagnCount, messageCount] = await Promise.all([
    User.countDocuments(),
    Contact.countDocuments(),
    Message.countDocuments(),
    Campaign.countDocuments()
  ]);
  res.json({ userCount, contactCount, campagnCount, messageCount });
};

// return last 10 campagns
const getRecentActivity = async (req, res) => { 
  try{
    const recentCampagns = await Campaign.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('createdBy'); 

    const recentMessages = await Message.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('recipient campagn');

    res.json({ recentCampagns, recentMessages });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ message: 'Failed to fetch recent activity' });
  }
};

/*const getFieldMessages = //return messages with "failed" status */

module.exports = { admin, getAllUsers, updateUser, deleteUser, getDashboardStats, getRecentActivity }