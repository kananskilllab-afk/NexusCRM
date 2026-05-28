const mongoose = require('mongoose');

const QuoteSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    quote_number: { type: String, unique: true, sparse: true, index: true },
    lead_id: { type: String, required: true, index: true },
    items: { type: [mongoose.Schema.Types.Mixed], default: [] }, // {desc, qty, cost, sell}
    cost_total: { type: Number, default: 0 },
    sell_total: { type: Number, default: 0 },
    margin: { type: Number, default: 0 },
    discount_pct: { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0 },
    final_total: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['Draft', 'Pending Approval', 'Ready to Send', 'Sent', 'Approved', 'Rejected', 'Expired'],
      default: 'Draft'
    },
    approval_required: { type: Boolean, default: false },
    approver_name: { type: String },
    approved_at: { type: Date },
    rejection_reason: { type: String },
    valid_until: { type: Date },
    terms: { type: String },
    created_by: { type: String }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

QuoteSchema.statics.nextQuoteNumber = async function () {
  const Counter = require('./Counter');
  const seq = await Counter.bump('quote_number', 50000);
  return `QT-${seq}`;
};

module.exports = mongoose.model('NexusQuote', QuoteSchema);
