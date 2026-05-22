const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Lead = require('../models/Lead');
const { authenticateToken } = require('../middleware/auth');

// GET /api/analytics/revenue
router.get('/revenue', authenticateToken, async (req, res) => {
  const { from, to } = req.query;
  
  try {
    const match = { type: 'received' };
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = from;
      if (to) match.date.$lte = to;
    }

    const data = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $substr: ['$date', 0, 7] },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Map `_id` to `month` for frontend compatibility
    const formatted = data.map(item => ({
      month: item._id,
      revenue: item.revenue
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
});

// GET /api/analytics/top-customers
router.get('/top-customers', authenticateToken, async (req, res) => {
  const limit = req.query.limit || 5;
  
  try {
    const data = await Payment.aggregate([
      { $match: { type: 'received' } },
      {
        $lookup: {
          from: 'leads',
          localField: 'lead_id',
          foreignField: 'id',
          as: 'lead'
        }
      },
      { $unwind: '$lead' },
      {
        $group: {
          _id: '$lead.email',
          total_spent: { $sum: '$amount' }
        }
      },
      { $sort: { total_spent: -1 } },
      { $limit: Number(limit) }
    ]);

    // Map `_id` to `customer` for frontend compatibility
    const formatted = data.map(item => ({
      customer: item._id,
      total_spent: item.total_spent
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch top customers' });
  }
});

// GET /api/analytics/status-distribution
router.get('/status-distribution', authenticateToken, async (req, res) => {
  try {
    const data = await Lead.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Map `_id` to `status` for frontend compatibility
    const formatted = data.map(item => ({
      status: item._id,
      count: item.count
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch status distribution' });
  }
});

module.exports = router;
