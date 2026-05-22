const mongoose = require('mongoose');

const FollowUpSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    lead_id: { type: String, required: true },
    date: { type: String, required: true },
    method: { type: String, default: 'Phone' },
    notes: { type: String },
    outcome: { type: String },
    next_date: { type: String },
    status: { type: String, default: 'Pending' },
    created_by: { type: String }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.model('FollowUp', FollowUpSchema);
