const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
  message: { type: String, required: true },
  type: { type: String, enum: ['individual', 'group', 'broadcast/everyone'], required: true },
  recipients: [{ type: mongoose.Schema.Types.ObjectId, refPath: 'recipientType' }],
  recipientType: { type: String, enum: [ 'User', 'Contact'], required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'group'},  // optional
  schedule: { type: Date }, // optional
  recurring: {
    active: { type: Boolean, default: false },
    interval: { type: String, good: ['daily', 'weekly', 'monthly']}
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
}, { timestamps: true });


module.exports = mongoose.model('Campaign', CampaignSchema);