const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    user_id: { type: String },
    title: { type: String, required: true },
    message: { type: String },
    type: { type: String, default: 'info' },
    is_read: { type: Number, default: 0 },
    lead_id: { type: String }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
