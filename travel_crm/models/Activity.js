const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    tenant_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    contact_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['call', 'email', 'meeting', 'note', 'task', 'whatsapp', 'follow_up'],
      required: true,
    },
    note:         { type: String },
    scheduled_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

activitySchema.index({ tenant_id: 1, contact_id: 1 });
activitySchema.index({ tenant_id: 1, booking_id: 1 });

module.exports = mongoose.models.Activity || mongoose.model('Activity', activitySchema);
