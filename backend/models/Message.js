const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  recipients: [{ type: mongoose.Schema.Types.ObjectId, refPath: 'recipientType' }],
  recipientType: { type: String, enum: ['User', 'Contact'], required: true },
  phoneNumber: { type: String, required: true },
  content: { type: String, required: true },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  response: { type: Object },
  sentAt: { type: Date }
}, { timestamps: true });


module.exports = mongoose.model('Message', messageSchema);