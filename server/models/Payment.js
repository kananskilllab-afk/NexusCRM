const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    lead_id: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    method: { type: String, default: 'Cash' },
    reference: { type: String },
    note: { type: String },
    type: { type: String, default: 'received' },
    created_by: { type: String }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// Post-Save Loyalty Points Accumulation Automation
PaymentSchema.post('save', async function (doc) {
  try {
    // Only process if it is a received payment
    if (doc.type !== 'received') return;

    const Lead = require('./Lead');
    const Customer = require('./Customer');
    const LoyaltyPoints = require('./LoyaltyPoints');

    // 1. Find the lead associated with this payment to find the customer's email
    const lead = await Lead.findOne({ id: doc.lead_id });
    if (!lead || !lead.email) return;

    // 2. Find the customer associated with this lead email
    const customer = await Customer.findOne({ email: lead.email });
    if (!customer) return;

    // 3. Calculate loyalty points earned (1 point per 100 base currency)
    const pointsToEarn = Math.floor(doc.amount / 100);
    if (pointsToEarn <= 0) return;

    // 4. Find or create LoyaltyPoints record for this customer
    const pointsRecord = await LoyaltyPoints.findOne({ customer_id: customer.id });
    if (pointsRecord) {
      pointsRecord.points_earned += pointsToEarn;
      await pointsRecord.save();
      console.log(`🪙 Automatically credited ${pointsToEarn} loyalty points to Customer: ${customer.first_name} (ID: ${customer.id}). New Total: ${pointsRecord.points_earned}`);
    } else {
      const { generateId } = require('../middleware/auth');
      const newLPId = generateId ? generateId('LP') : `LP-${Date.now()}`;
      
      await LoyaltyPoints.create({
        id: newLPId,
        customer_id: customer.id,
        points_earned: pointsToEarn,
        points_redeemed: 0
      });
      console.log(`🪙 Created loyalty profile and automatically credited ${pointsToEarn} loyalty points to Customer: ${customer.first_name} (ID: ${customer.id})`);
    }
  } catch (err) {
    console.error('❌ Error in Payment post-save loyalty automation hook:', err);
  }
});

module.exports = mongoose.model('Payment', PaymentSchema);
