const Group = require('../models/Group');
const Contact = require('../models/Contact');
const sendSMS = require('../services/smsService');

const getAllGroups = async (req, res) => {
  try{
    const groups = await Group.find().select('-password');
    res.json(groups);
  } catch (error) {
    console.error('Group list error: ', error);
    res.status(500).json({ message: 'Server error' })
  }
};

const createGroup = async (req, res) => {
  const { name } = req.body;
  try {
    const existing = await Group.findOne({ name, owner: req.user._id });
    if (existing) {
      return res.status(400).json({ message: 'Group name already exist' });
    }
    const group = await Group.create({ name, owner: req.user._id });
    res.status(201).json(group);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const addContactToGroup = async (req, res) => {
  try{
    const { name, phoneNumber } = req.body;
    const contact = await Contact.create({ name, phoneNumber, group : req.params.groupId });
    await Group.findByIdAndUpdate(req.params.groupId, {$push: { memebers: contact._id } });
    res.status(201).json(contact);
  } catch (error) {
    console.error('add member error', error);
    res.status(500).json({message: 'Server error'});
  }
  
};

const sendGroupSMS = async (req, res) => {
  try{
      const { content, campaign } = req.body;
    const group = await Group.findById(req.params.groupId).populate('members');
    const result = await Promise.all(
      group.memebers.map((contact) => 
        sendSMS({
          senderId: req.user._id,
          recipient: contact.phoneNumber,
          content,
          campagn,
        })
      )
    );
    res.json({ message: 'Group SMS sent ', result });
  } catch (error){
    console.error('sending group SMS error');
    res.status(500).json({message: 'Server error'});
    res.json(error);
  }
};

const deleteGroup = async (req, res) => {
  const { content, campaign } = req.body;
  const group = await Group.findById(req.params.groupId).populate('members');
  const result = await Promise.all(
    group.memebers.map((contact) => 
      sendSMS({
        senderId: req.user._id,
        recipient: contact.phoneNumber,
        content,
        campaign,
      })
    )
  );
  res.json({ message: 'Group SMS sent ', result });
};


module.exports = { getAllGroups, createGroup, addContactToGroup, sendGroupSMS, deleteGroup }


