const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    tenant_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }, // optional — may not exist in pure-CRM installs
    booking_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    contact_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
    uploaded_by: { type: String }, // CRM user ID (string) or ObjectId — stored as string for compatibility
    uploaded_by_name: { type: String }, // human-readable uploader name
    type: {
      type: String,
      enum: ['passport', 'visa', 'invoice', 'ticket', 'voucher', 'insurance', 'itinerary', 'contract', 'other'],
      required: true,
    },
    storage_key: { type: String, required: true }, // file path or S3/GCS object key
    filename:    { type: String, required: true },
    mime_type:   { type: String },
    size_bytes:  { type: Number },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

documentSchema.index({ booking_id: 1 });
documentSchema.index({ contact_id: 1 });

module.exports = mongoose.models.Document || mongoose.model('Document', documentSchema);
