const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema(
  {
    tenant_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    contact_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
    stage_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'PipelineStage' },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
      default: 'draft',
    },
    currency_code:    { type: String, default: 'INR', uppercase: true, maxlength: 3 },
    total_sell_cents: { type: Number, default: 0 },  // store money as cents
    travel_dates: {
      start: { type: Date },
      end:   { type: Date },
    },
    destinations: [{ type: String }],
    pax_count:  { type: Number, default: 1 },
    notes:      { type: String },
    expires_at: { type: Date },
    accepted_at:{ type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

quoteSchema.index({ tenant_id: 1, contact_id: 1 });
quoteSchema.index({ tenant_id: 1, status: 1 });

module.exports = mongoose.model('Quote', quoteSchema);
