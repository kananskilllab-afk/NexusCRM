const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    user_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['booking_update', 'payment_due', 'task_due', 'mention', 'system', 'commission'],
      required: true,
    },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    channel: {
      type: String,
      enum: ['in_app', 'email', 'sms', 'push'],
      default: 'in_app',
    },
    read_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

notificationSchema.index({ user_id: 1, read_at: 1 });

module.exports = mongoose.models.VoyageNotification || mongoose.model('VoyageNotification', notificationSchema);
