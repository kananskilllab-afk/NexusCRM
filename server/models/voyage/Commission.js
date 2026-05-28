const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema(
  {
    booking_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    supplier_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'VoyageSupplier' },
    agent_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expected_cents: { type: Number, default: 0 },
    received_cents: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'partial', 'received', 'overdue', 'written_off'],
      default: 'pending',
    },
    received_at: { type: Date },
  },
  { timestamps: false }
);

commissionSchema.index({ booking_id: 1 });
commissionSchema.index({ agent_id: 1, status: 1 });

module.exports = mongoose.model('Commission', commissionSchema);
