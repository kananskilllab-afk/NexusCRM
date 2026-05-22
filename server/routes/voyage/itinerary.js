const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { ItineraryVersion } = require('../../../travel_crm/models');

// Get itinerary segments for a booking
router.get('/:bookingId', authenticateToken, async (req, res) => {
  const { bookingId } = req.params;
  
  try {
    const version = await ItineraryVersion.findOne({ booking_id: bookingId })
      .sort({ version_num: -1 })
      .lean();
      
    if (!version) {
      return res.json({ state_json: null });
    }
    
    // The model has 'content' property (Mixed). 
    // We convert it back to the state_json string that the frontend expects.
    res.json({
      id: version._id.toString(),
      booking_id: version.booking_id.toString(),
      version_num: version.version_num,
      state_json: JSON.stringify(version.content),
      created_by: version.created_by ? version.created_by.toString() : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save itinerary segments
router.put('/:bookingId', authenticateToken, async (req, res) => {
  const { bookingId } = req.params;
  const { state_json } = req.body;
  const created_by = req.user.id;
  
  try {
    const latest = await ItineraryVersion.findOne({ booking_id: bookingId })
      .sort({ version_num: -1 })
      .lean();
      
    const nextVersion = latest ? latest.version_num + 1 : 1;
    
    // Parse the state_json back to object for MongoDB storage
    const content = state_json ? JSON.parse(state_json) : {};
    
    const newVersion = await ItineraryVersion.create({
      booking_id: bookingId,
      created_by: created_by.match(/^[0-9a-fA-F]{24}$/) ? created_by : undefined, // Ensure valid ObjectId
      version_num: nextVersion,
      content: content
    });
    
    res.json({ message: 'Itinerary saved', version_num: nextVersion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
