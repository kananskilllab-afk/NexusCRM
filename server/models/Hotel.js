const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    city: { type: String, required: true },
    star: { type: Number, default: 3 },
    is_preferred: { type: Boolean, default: false },
    address: { type: String },
    contact_phone: { type: String },
    contact_email: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.models.Hotel || mongoose.model('Hotel', hotelSchema);
