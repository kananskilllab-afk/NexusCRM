const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { PipelineStage, Booking, Tenant } = require('../../../travel_crm/models');

// Get full pipeline state
router.get('/', authenticateToken, async (req, res) => {
  try {
    let stages = await PipelineStage.find().sort({ position: 1 }).lean();
    
    // If no stages exist, seed default ones
    if (stages.length === 0) {
      const tenant = await Tenant.findOne();
      if (tenant) {
        await PipelineStage.insertMany([
          { tenant_id: tenant._id, name: 'Enquiry',   position: 1, is_closed_won: false },
          { tenant_id: tenant._id, name: 'Proposal',  position: 2, is_closed_won: false },
          { tenant_id: tenant._id, name: 'Confirmed', position: 3, is_closed_won: true  },
          { tenant_id: tenant._id, name: 'Completed', position: 4, is_closed_won: true  },
        ]);
        stages = await PipelineStage.find().sort({ position: 1 }).lean();
      }
    }
    
    const bookings = await Booking.find().populate('contact_id').lean();
    
    // Format stages and bookings to match React client expectations
    const formattedStages = stages.map(s => ({
      id: s._id.toString(),
      name: s.name,
      position: s.position
    }));
    
    const formattedBookings = bookings.map(b => ({
      id: b._id.toString(),
      stage_id: b.stage_id ? b.stage_id.toString() : null,
      destination: b.destination || 'Custom Trip',
      last_name: b.contact_id ? b.contact_id.full_name : 'Client',
      total_sell_cents: b.total_sell_cents,
      status: b.status,
      travel_dates: b.travel_dates
    }));
    
    res.json({
      stages: formattedStages,
      bookings: formattedBookings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
