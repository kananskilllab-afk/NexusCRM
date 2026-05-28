const mongoose = require('mongoose');

const bookingPassengerSchema = new mongoose.Schema(
  {
    booking_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    first_name:      { type: String, required: true, trim: true },
    last_name:       { type: String, required: true, trim: true },
    dob:             { type: Date },
    passport_num:    { type: String },
    passport_expiry: { type: Date },
    nationality:     { type: String, uppercase: true, maxlength: 2 }, // ISO 3166-1 alpha-2
  },
  { timestamps: false }
);

bookingPassengerSchema.index({ booking_id: 1 });

module.exports = mongoose.model('BookingPassenger', bookingPassengerSchema);
