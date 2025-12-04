const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{ 
    type: mongoose.Schema.Types.ObjectId, ref: 'Contact' 
  }],
  
});


module.exports = mongoose.model( 'Group', groupSchema );