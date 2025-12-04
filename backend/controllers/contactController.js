const Contact = require('../models/Contact');
const Group = require('../models/Group');

const isValidPhoneNumber = (number) => /^\+[1-9]\d{1,14}$/.test(number);

const createContact = async (req, res) => {
  const { name, phoneNumber, groups } = req.body;

  // Validate required fields
  if (!phoneNumber) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  // Validate phone number format
  if (!isValidPhoneNumber(phoneNumber)) {
    return res.status(400).json({ message: 'Invalid phone number format. Must be in format: +[country code][number] (e.g., +251912345678)' });
  }

  try {
    const existing = await Contact.findOne({ phoneNumber });
    if (existing) {
      // Return existing contact to allow id reuse instead of returning an error
      const populated = await Contact.findById(existing._id).populate('groups', 'name');
      return res.status(200).json(populated);
    }

    const contactData = {
      name: name || phoneNumber,
      phoneNumber,
      createdBy: req.user._id
    };

    // Accept a group id (string/ObjectId) or skip if not provided
    if (groups) {
      contactData.groups = groups;
    }

    const contact = await Contact.create(contactData);
    const populatedContact = await Contact.findById(contact._id).populate('groups', 'name');

    res.status(201).json(populatedContact);
  } catch (error) {
    console.error('Create contact error:', error);
    // Return more specific error messages
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to create contact', error: error.message });
  }
};

const getAllContacts = async (req, res) => {
  try {
    // return contacts created by the user; admins get all contacts
    const filter = req.user?.role === 'admin' ? {} : { createdBy: req.user._id };
    const contacts = await Contact.find(filter).populate('groups', 'name');
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ message: 'Failed to fetch contacts' });
  }
};
// const getAllContacts = async (req, res) => {
//   try{
//     const contacts = await Contact.find().populate('groups');
//     res.json(contacts);
//   } catch (error) {
//     res.status(500).json({ message: 'Failed to fetch contacts' });
//   }
// };

const updateContact = async (req, res) => {
  try {
    const { name, phoneNumber, groups } = req.body;

    // Validate phone number if provided
    if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Contact not found' });

    // Check if user is admin or owner
    if (req.user.role !== 'admin' && String(contact.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You do not have permission to update this contact' });
    }

    // Check if phone number already exists (if changed)
    if (phoneNumber && phoneNumber !== contact.phoneNumber) {
      const existing = await Contact.findOne({ phoneNumber, _id: { $ne: req.params.id } });
      if (existing) return res.status(400).json({ message: 'Phone number already exists' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (groups !== undefined) updateData.groups = groups || null;

    const updatedContact = await Contact.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('groups', 'name');

    res.json(updatedContact);
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ message: 'Failed to update contact' });
  }
};

const deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Contact not found' });

    // Check if user is admin or owner
    if (req.user.role !== 'admin' && String(contact.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You do not have permission to delete this contact' });
    }

    await Contact.findByIdAndDelete(req.params.id);
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ message: 'Failed to delete contact' });
  }
};

module.exports = { createContact, getAllContacts, updateContact, deleteContact };