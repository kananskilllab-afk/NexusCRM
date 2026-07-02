const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema(
  {
    tenant_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    name:       { type: String, required: true, trim: true },
    subject:    { type: String, required: true },
    body_html:  { type: String, required: true },
    body_text:  { type: String },
    variables:  { type: mongoose.Schema.Types.Mixed, default: [] }, // e.g. ['first_name', 'booking_ref']
    category: {
      type: String,
      enum: ['confirmation', 'payment_reminder', 'itinerary', 'marketing', 'cancellation', 'other'],
      default: 'other',
    },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
