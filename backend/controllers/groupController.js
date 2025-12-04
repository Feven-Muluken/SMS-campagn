const Group = require('../models/Group');
const Contact = require('../models/Contact');
const sendSMS = require('../services/smsService');

const getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .select('-password')
      .populate('members', 'name phoneNumber')
      .populate('owner', 'name email');
    res.json(groups);
  } catch (error) {
    console.error('Group list error: ', error);
    res.status(500).json({ message: 'Server error' })
  }
};

const createGroup = async (req, res) => {
  const { name, members } = req.body;
  try {
    if (!name) return res.status(400).json({ message: 'Group name required' });
    const existing = await Group.findOne({ name, owner: req.user._id });
    if (existing) {
      return res.status(400).json({ message: 'Group name already exist' });
    }

    const groupData = { name, owner: req.user._id };
    if (members && Array.isArray(members) && members.length > 0) {
      // Validate that all members are valid contact IDs
      const validContacts = await Contact.find({ _id: { $in: members } });
      if (validContacts.length !== members.length) {
        return res.status(400).json({ message: 'One or more contact IDs are invalid' });
      }
      groupData.members = members;
    }

    const group = await Group.create(groupData);
    const populatedGroup = await Group.findById(group._id).populate('members', 'name phoneNumber');
    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const addContactToGroup = async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    // Create contact and set its `groups` field (Contact schema uses `groups`)
    const contact = await Contact.create({ name, phoneNumber, groups: req.params.groupId, createdBy: req.user._id });
    // Push to canonical members array
    await Group.findByIdAndUpdate(req.params.groupId, { $push: { members: contact._id } });
    res.status(201).json(contact);
  } catch (error) {
    console.error('add member error', error);
    res.status(500).json({ message: 'Server error' });
  }

};

const sendGroupSMS = async (req, res) => {
  try {
    const { content, campaign } = req.body;
    const group = await Group.findById(req.params.groupId).populate('members');
    const result = await Promise.all(
      group.members.map((contact) =>
        sendSMS({
          senderId: req.user._id,
          recipient: contact.phoneNumber,
          content,
          campagn,
        })
      )
    );
    res.json({ message: 'Group SMS sent ', result });
  } catch (error) {
    console.error('sending group SMS error');
    res.status(500).json({ message: 'Server error' });
    res.json(error);
  }
};

const updateGroup = async (req, res) => {
  const { name, members } = req.body;
  try {
    if (!name) return res.status(400).json({ message: 'Group name required' });

    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Check if user is admin or owner
    if (req.user.role !== 'admin' && String(group.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You do not have permission to update this group' });
    }

    // Check if name already exists for this user
    const existing = await Group.findOne({
      name,
      owner: req.user._id,
      _id: { $ne: req.params.groupId }
    });
    if (existing) {
      return res.status(400).json({ message: 'Group name already exists' });
    }

    const updateData = { name };
    if (members !== undefined) {
      if (Array.isArray(members)) {
        // Validate that all members are valid contact IDs
        if (members.length > 0) {
          const validContacts = await Contact.find({ _id: { $in: members } });
          if (validContacts.length !== members.length) {
            return res.status(400).json({ message: 'One or more contact IDs are invalid' });
          }
        }
        updateData.members = members;
      } else {
        return res.status(400).json({ message: 'Members must be an array' });
      }
    }

    const updatedGroup = await Group.findByIdAndUpdate(
      req.params.groupId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('members', 'name phoneNumber');

    res.json(updatedGroup);
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Check if user is admin or owner
    if (req.user.role !== 'admin' && String(group.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You do not have permission to delete this group' });
    }

    await Group.findByIdAndDelete(req.params.groupId);
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


module.exports = { getAllGroups, createGroup, addContactToGroup, sendGroupSMS, updateGroup, deleteGroup }


