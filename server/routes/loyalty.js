const express = require('express');
const router = express.Router();
const LoyaltyPoints = require('../models/LoyaltyPoints');
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const { authenticateToken, generateId } = require('../middleware/auth');

// GET loyalty points for a customer
router.get('/:customerId', authenticateToken, async (req, res) => {
  try {
    const loyalty = await LoyaltyPoints.findOne({ customer_id: req.params.customerId }).lean();
    
    if (!loyalty) {
      return res.json({ customer_id: req.params.customerId, points_earned: 0, points_redeemed: 0, available_points: 0 });
    }
    
    res.json({
      ...loyalty,
      available_points: (loyalty.points_earned || 0) - (loyalty.points_redeemed || 0)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch loyalty points' });
  }
});

// REDEEM loyalty points for a booking
router.post('/redeem', authenticateToken, async (req, res) => {
  const { customerId, bookingId, pointsToRedeem } = req.body;
  
  try {
    const loyalty = await LoyaltyPoints.findOne({ customer_id: customerId });
    const available = loyalty ? ((loyalty.points_earned || 0) - (loyalty.points_redeemed || 0)) : 0;
    
    if (available < pointsToRedeem) {
      return res.status(400).json({ error: 'Insufficient loyalty points' });
    }
    
    // 100 points = $5 discount
    const discount = (pointsToRedeem / 100) * 5;
    
    // Update loyalty points
    if (!loyalty) {
      await LoyaltyPoints.create({
        id: generateId('loy'),
        customer_id: customerId,
        points_earned: 0,
        points_redeemed: pointsToRedeem
      });
    } else {
      loyalty.points_redeemed = (loyalty.points_redeemed || 0) + Number(pointsToRedeem);
      await loyalty.save();
    }
    
    // Update booking with discount (using Lead model)
    await Lead.updateOne(
      { id: bookingId },
      { $inc: { loyalty_discount_applied: discount } }
    );
      
    // Log activity
    await Activity.create({
      id: generateId('act'),
      lead_id: bookingId,
      type: 'Loyalty',
      text: `Redeemed ${pointsToRedeem} points for $${discount} discount`,
      user_name: req.user.name
    });

    res.json({ success: true, discountApplied: discount, remainingPoints: available - pointsToRedeem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
