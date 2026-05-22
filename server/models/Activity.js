const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    lead_id: { type: String, required: true },
    type: { type: String, default: 'Note' },
    text: { type: String, required: true },
    user_name: { type: String }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);
