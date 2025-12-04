const Campaign = require('../models/Campaign')
const User = require('../models/User')
const Contact = require('../models/Contact');
const Group = require('../models/Group');
const { default: mongoose } = require('mongoose');
const { isValidObjectId } = mongoose;


const createCampaign = async (req, res) => {
  try {
    const {
      name,
      message,
      type,
      recipients,
      group,
      schedule,
      recurring,
      recipientType
    } = req.body;

    // basic required fields
    if (!name || !message || !type || !recipientType) {
      return res.status(400).json({ message: 'Missing required fields: name, message, type, recipientType are required' });
    }

    // validate recipients array if provided
    if (!Array.isArray(recipients)) {
      return res.status(400).json({ message: 'recipients must be an array' });
    }

    const invalidId = recipients.filter(id => !isValidObjectId(id));
    if (invalidId.length > 0) {
      return res.status(400).json({ message: 'Invalid recipient ID(s)', invalidId });
    }

    // validate recipientType
    const allowedRecipientTypes = ['User', 'Contact'];
    if (!allowedRecipientTypes.includes(recipientType)) {
      return res.status(400).json({ message: `recipientType must be one of: ${allowedRecipientTypes.join(', ')}` });
    }

    // if group provided, validate existence and ownership (or admin)
    if (group) {
      if (!isValidObjectId(group)) return res.status(400).json({ message: 'Invalid group id' });
      const groupDoc = await Group.findById(group);
      if (!groupDoc) return res.status(404).json({ message: 'Group not found' });
      if (req.user?.role !== 'admin' && String(groupDoc.owner) !== String(req.user?._id)) {
        return res.status(403).json({ message: 'Group does not belong to you' });
      }
    }

    // validate recipients exist in their corresponding collection
    if (recipients.length > 0) {
      if (recipientType === 'Contact') {
        const found = await Contact.find({ _id: { $in: recipients } }).select('_id');
        if (found.length !== recipients.length) return res.status(400).json({ message: 'One or more recipients not found (Contact)' });
      } else if (recipientType === 'User') {
        const foundUsers = await User.find({ _id: { $in: recipients } }).select('_id');
        if (foundUsers.length !== recipients.length) return res.status(400).json({ message: 'One or more recipients not found (User)' });
      }
    }

    const campaign = await Campaign.create({
      name,
      message,
      type,
      recipients,
      group,
      schedule,
      recurring,
      recipientType,
      createdBy: req.user?._id
    });

    res.status(201).json(campaign);
  } catch (error) {
    if (error.name === 'ValidationError') {
    return res.status(400).json({ message: error.message });
  }

    console.error('Campaign creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


const getAllCampaigns = async (req, res) => {
  try{
    // Admins: return all campaigns. Regular users: return only campaigns they created.
    let campaigns;
    if (req.user?.role === 'admin') {
      campaigns = await Campaign.find().select();
    } else {
      campaigns = await Campaign.find({ createdBy: req.user?._id }).select();
    }
    res.json(campaigns);
  } catch (error) {
    console.error('Failed to fetch campaigns:', error);
    res.status(500).json({ message: 'Failed to fetch campaigns' });
  }
};

const updateCampaign = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) { return res.status(400).json({ message: 'Invalid user ID format' });
  }
  try{
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch campaigns' });
  }
};

const deleteCampaign = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) { return res.status(400).json({ message: 'Invalid user ID format' });
  }
  try{
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json({ message: 'Campaign deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete campaign' });
  }
};

const getCampaignById = async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid campaign id' });
  try {
    const campaign = await Campaign.findById(id)
      .populate('recipients')
      .populate('group')
      .populate('createdBy', 'name email');
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    // Only admins or the campaign creator can fetch a campaign
    if (req.user?.role !== 'admin' && String(campaign.createdBy?._id || campaign.createdBy) !== String(req.user?._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Failed to fetch campaign by id:', error);
    res.status(500).json({ message: 'Failed to fetch campaign' });
  }
};


module.exports = { createCampaign, getAllCampaigns, getCampaignById, updateCampaign, deleteCampaign };