const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    tenant_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    type: {
      type: String,
      enum: ['airline', 'hotel', 'transfer', 'tour_operator', 'cruise_line', 'car_hire', 'insurance', 'other'],
      required: true,
    },
    name:                   { type: String, required: true, trim: true },
    commission_pct:         { type: Number, default: 0 },
    contact_email:          { type: String, lowercase: true },
    primary_contact_name:   { type: String },   // NEW
    primary_contact_phone:  { type: String },   // NEW
    bank_details_encrypted: { type: String },   // NEW – AES-256 blob, never expose via API
    payment_terms:          { type: Number },   // days
    is_preferred:           { type: Boolean, default: false },
    metadata:               { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

supplierSchema.index({ tenant_id: 1, name: 1 });

module.exports = mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema);
