const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    tenant_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    account_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }, // corporate parent
    email:       { type: String, lowercase: true, trim: true },
    phone:       { type: String, trim: true },
    full_name:   { type: String, required: true, trim: true },
    source: {
      type: String,
      enum: ['referral', 'web', 'campaign', 'walk_in', 'social', 'partner', 'other'],
    },
    lifecycle_stage: {
      type: String,
      enum: ['lead', 'prospect', 'active', 'lapsed'],
      default: 'lead',
    },
    lead_score: { type: Number, default: 0, min: 0, max: 100 },
    profile: { type: mongoose.Schema.Types.Mixed, default: {} }, // flexible KV store
    gdpr_consent_at:   { type: Date },
    last_contacted_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

contactSchema.index({ tenant_id: 1, email: 1 });
contactSchema.index({ tenant_id: 1, lifecycle_stage: 1 });

module.exports = mongoose.model('Contact', contactSchema);
