const mongoose = require('mongoose');

const LoyaltyPointsSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    customer_id: { type: String, required: true },
    points_earned: { type: Number, default: 0 },
    points_redeemed: { type: Number, default: 0 }
  },
  { timestamps: { createdAt: false, updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('LoyaltyPoints', LoyaltyPointsSchema);
