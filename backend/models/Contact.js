const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
  name: String,
  phoneNumber: { type: String, required: true },
  groups: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Group' 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });


module.exports = mongoose.model('Contact', contactSchema);