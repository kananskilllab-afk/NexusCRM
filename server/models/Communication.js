const mongoose = require('mongoose');

const CommunicationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    lead_id: { type: String, required: true },
    channel: { type: String, required: true },
    direction: { type: String, default: 'outbound' },
    template_name: { type: String },
    content: { type: String, required: true },
    status: { type: String, default: 'Sent' },
    sent_by: { type: String }
  },
  { timestamps: { createdAt: 'sent_at', updatedAt: false } }
);

module.exports = mongoose.model('Communication', CommunicationSchema);
