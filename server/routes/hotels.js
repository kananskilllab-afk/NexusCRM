const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const Hotel = require('../models/Hotel');

// GET /api/hotels
router.get('/', authenticateToken, async (req, res) => {
  try {
    const hotels = await Hotel.find().sort({ name: 1 }).lean();
    res.json(hotels.map(h => ({ ...h, id: h._id.toString() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hotels
router.post('/', authenticateToken, requireRole(4), async (req, res) => {
  try {
    const hotel = await Hotel.create(req.body);
    res.status(201).json({ ...hotel.toObject(), id: hotel._id.toString() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/hotels/:id
router.put('/:id', authenticateToken, requireRole(4), async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!hotel) return res.status(404).json({ error: 'Hotel not found' });
    res.json({ ...hotel.toObject(), id: hotel._id.toString() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/hotels/:id
router.delete('/:id', authenticateToken, requireRole(4), async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndDelete(req.params.id);
    if (!hotel) return res.status(404).json({ error: 'Hotel not found' });
    res.json({ message: 'Hotel deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
