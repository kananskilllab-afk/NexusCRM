const mongoose = require('mongoose');

const financialEventSchema = new mongoose.Schema(
  {
    tenant_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    booking_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    payment_schedule_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentSchedule' }, // NEW
    recorded_by:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    event_type: {
      type: String,
      enum: ['deposit', 'balance', 'refund', 'supplier_payment', 'commission_received', 'charge', 'credit'],
      required: true,
    },
    amount_cents: { type: Number, required: true },
    currency:     { type: String, default: 'INR', uppercase: true, maxlength: 3 },
    due_date:     { type: Date },
    paid_at:      { type: Date },
    stripe_pi_id: { type: String },
    recorded_at:  { type: Date, default: Date.now },
  },
  { timestamps: false }
);

financialEventSchema.index({ booking_id: 1 });
financialEventSchema.index({ tenant_id: 1, event_type: 1 });

module.exports = mongoose.model('FinancialEvent', financialEventSchema);
