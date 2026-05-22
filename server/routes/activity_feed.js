const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get last 20 activities across all leads joined with lead names
    const activities = await Activity.aggregate([
      {
        $lookup: {
          from: 'leads',
          localField: 'lead_id',
          foreignField: 'id',
          as: 'lead'
        }
      },
      { $unwind: { path: '$lead', preserveNullAndEmptyArrays: true } },
      { $sort: { created_at: -1 } },
      { $limit: 20 }
    ]);

    const formatted = activities.map(a => ({
      id: a.id,
      lead_id: a.lead_id,
      type: a.type,
      text: a.text,
      user_name: a.user_name,
      created_at: a.created_at,
      first_name: a.lead ? a.lead.first_name : null,
      last_name: a.lead ? a.lead.last_name : null
    }));
    
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

module.exports = router;
