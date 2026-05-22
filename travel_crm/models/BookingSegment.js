const mongoose = require('mongoose');

const bookingSegmentSchema = new mongoose.Schema(
  {
    booking_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    supplier_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    contract_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'SupplierContract' }, // NEW
    segment_type: {
      type: String,
      enum: ['flight', 'hotel', 'transfer', 'tour', 'cruise', 'rail', 'car_hire', 'insurance', 'other'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'on_request', 'waitlisted'],
      default: 'pending',
    },
    is_on_request:      { type: Boolean, default: false }, // NEW
    start_at:           { type: Date },
    end_at:             { type: Date },
    cost_cents:         { type: Number, default: 0 },
    sell_cents:         { type: Number, default: 0 },
    cancellation_policy:{ type: String }, // NEW
    confirmation_ref:   { type: String },
    supplier_ref:       { type: String },
    metadata:           { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: false }
);

bookingSegmentSchema.index({ booking_id: 1 });
bookingSegmentSchema.index({ supplier_id: 1 });

module.exports = mongoose.model('BookingSegment', bookingSegmentSchema);
