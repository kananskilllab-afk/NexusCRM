const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    user_id: { type: String, index: true }, // CRMUser.name the alert is for
    title: { type: String, required: true },
    message: { type: String },
    type: { type: String, default: 'info' }, // info | sla_breach | followup_due | lead_stale | opp_rotting | nurture_closed
    is_read: { type: Number, default: 0 },
    lead_id: { type: String },
    // Generic link target so any entity (opportunity, lead, …) can be referenced.
    entity_type: { type: String }, // 'lead' | 'opportunity'
    entity_id: { type: String, index: true },
    link: { type: String }, // client route to open on click
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

NotificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
