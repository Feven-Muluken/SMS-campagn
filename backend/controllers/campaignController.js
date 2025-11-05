const Campaign = require('../models/Campaign')
const  User = require('../models/User')
const Contact = require('../models/Contact');
const { default: mongoose } = require('mongoose');
const { isValidObjectId } = mongoose;


const createCampaign = async (req, res) => {
  try {
    const {
      message,
      type,
      recipients,
      group,
      schedule,
      recurring,
      recipientType
    } = req.body;

    if (!message || !type || !recipientType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const invalidId = recipients.filter(id => !isValidObjectId(id));
    if (invalidId.length > 0) {
      return res.status(400).json({
      message: 'Invalid recipient ID(s)',
      invalidId
      });
    }

    const campaign = await Campaign.create({
      message,
      type,
      recipients,
      group,
      schedule,
      recurring,
      recipientType,
      createdBy: req.user._id
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
    const campaigns = await Campaign.find().select();
    res.json(campaigns);
  } catch (error) {
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


module.exports = { createCampaign, getAllCampaigns, updateCampaign, deleteCampaign };