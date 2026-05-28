const mongoose = require('mongoose');

const itineraryVersionSchema = new mongoose.Schema(
  {
    booking_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    created_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    version_num: { type: Number, required: true, default: 1 },
    content:     { type: mongoose.Schema.Types.Mixed, required: true }, // full itinerary JSON
    share_token: { type: String, unique: true, sparse: true },          // public share link token
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

itineraryVersionSchema.index({ booking_id: 1, version_num: -1 });

module.exports = mongoose.model('ItineraryVersion', itineraryVersionSchema);
