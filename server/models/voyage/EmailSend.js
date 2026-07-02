const mongoose = require('mongoose');

const emailSendSchema = new mongoose.Schema(
  {
    tenant_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },
    contact_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
    booking_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    sent_by:     { type: mongoose.Schema.Types.ObjectId, ref: 'CRMUser' },
    is_bulk:     { type: Boolean, default: false },
    to_email:    { type: String, required: true, lowercase: true },
    subject:     { type: String, required: true },
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'],
      default: 'queued',
    },
    opened_at:  { type: Date },
    clicked_at: { type: Date },
    bounced_at: { type: Date },
    sent_at:    { type: Date },
    error_message: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

emailSendSchema.index({ tenant_id: 1, contact_id: 1 });
emailSendSchema.index({ tenant_id: 1, status: 1 });

module.exports = mongoose.model('EmailSend', emailSendSchema);
