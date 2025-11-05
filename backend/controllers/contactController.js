const Contact = import('../models/Contact');

const isValidPhoneNumber = (number) => /^\+[1-9]\d{1, 14}$/.test(number);

const craeteContact = async (req, res) => {
  const { name, phoneNumber, groups } = req.body;
  if (!isValidPhoneNumber(phoneNumber)){
    return res.status(400).json({ message: 'Invalid phone number format' });
  }
  
  try{
    const existing = await Contact.findOne({ phoneNumber });
    if  (existing) return res.status(400).json({ message: 'Contact already exists' });

    const contact = await Contact.create({
      name, 
      phoneNumber, 
      groups, 
      createddBy: req.user._id
    });
    res.status(201).json({ contact });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create contact' });
  }
};

const getAllContacts = async (req, res) => {
  try{
    const contacts = await Contact.find().populate('groups');
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch contacts' });
  }
};

const updateContact = async (req, res) => {
  try{
    const contact = await Contact.findByIdAndUpdate(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Contact not found' });
    res.json(contact, 'Conact updated');
  } catch (error) {
    res.status(500).json({ message: 'Failed to update contact' });
  }
};

const deleteAllContact = async (req, res) => {
  try{
    const contact = (await Contact).findByIdAndDelete(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Contact not found' });
    res.json({ message: 'Contact delete' });
  } catch(error) {
    res.status(500).json({ message: 'Failed to delete contact' });
  }
};

module.exports = { craeteContact, getAllContacts, updateContact, deleteAllContact };