const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    tenant_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    contact_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
    stage_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'PipelineStage' },
    assigned_to:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    quote_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },         // NEW: traceability
    group_booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },       // NEW: self-ref
    status: {
      type: String,
      enum: ['enquiry', 'on_hold', 'confirmed', 'completed', 'cancelled', 'refunded'],
      default: 'enquiry',
    },
    currency_code:      { type: String, default: 'INR', uppercase: true, maxlength: 3 },
    total_cost_cents:   { type: Number, default: 0 },
    total_sell_cents:   { type: Number, default: 0 },
    margin_pct:         { type: Number, default: 0 },
    itinerary_version:  { type: Number, default: 1 },
    travel_dates: {
      start: { type: Date },
      end:   { type: Date },
    },
    cancellation_reason: { type: String }, // NEW
    destination:         { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

bookingSchema.index({ tenant_id: 1, contact_id: 1 });
bookingSchema.index({ tenant_id: 1, status: 1 });
bookingSchema.index({ tenant_id: 1, 'travel_dates.start': 1 });

module.exports = mongoose.model('Booking', bookingSchema);
