const mongoose = require('mongoose');

const paymentScheduleSchema = new mongoose.Schema(
  {
    booking_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    installment_number:  { type: Number, required: true },
    label:               { type: String },  // e.g. 'Deposit', 'Final Balance'
    amount_cents:        { type: Number, required: true },
    due_date:            { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'waived', 'partial'],
      default: 'pending',
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

paymentScheduleSchema.index({ booking_id: 1, installment_number: 1 });

module.exports = mongoose.model('PaymentSchedule', paymentScheduleSchema);
