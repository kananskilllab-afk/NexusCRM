const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { BookingPassenger } = require('../../../travel_crm/models');

// GET /api/voyage/passengers/:bookingId — list passengers for a booking
router.get('/:bookingId', authenticateToken, async (req, res) => {
  try {
    const passengers = await BookingPassenger.find({ booking_id: req.params.bookingId }).lean();
    const formatted = passengers.map(p => ({
      id: p._id.toString(),
      booking_id: p.booking_id.toString(),
      first_name: p.first_name,
      last_name: p.last_name,
      dob: p.dob ? new Date(p.dob).toISOString().split('T')[0] : '',
      passport_num: p.passport_num || '',
      passport_expiry: p.passport_expiry ? new Date(p.passport_expiry).toISOString().split('T')[0] : '',
      nationality: p.nationality || ''
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/voyage/passengers/:bookingId — add a passenger
router.post('/:bookingId', authenticateToken, async (req, res) => {
  const { first_name, last_name, dob, passport_num, passport_expiry, nationality } = req.body;
  try {
    const passenger = await BookingPassenger.create({
      booking_id: req.params.bookingId,
      first_name,
      last_name,
      dob: dob ? new Date(dob) : undefined,
      passport_num,
      passport_expiry: passport_expiry ? new Date(passport_expiry) : undefined,
      nationality: nationality ? nationality.toUpperCase() : undefined
    });
    res.status(201).json({ id: passenger._id.toString(), message: 'Passenger added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/voyage/passengers/:bookingId/:passengerId — update a passenger
router.put('/:bookingId/:passengerId', authenticateToken, async (req, res) => {
  const { first_name, last_name, dob, passport_num, passport_expiry, nationality } = req.body;
  try {
    const updated = await BookingPassenger.findByIdAndUpdate(
      req.params.passengerId,
      {
        first_name,
        last_name,
        dob: dob ? new Date(dob) : undefined,
        passport_num,
        passport_expiry: passport_expiry ? new Date(passport_expiry) : undefined,
        nationality: nationality ? nationality.toUpperCase() : undefined
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Passenger not found' });
    res.json({ message: 'Passenger updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/voyage/passengers/:bookingId/:passengerId
router.delete('/:bookingId/:passengerId', authenticateToken, async (req, res) => {
  try {
    await BookingPassenger.findByIdAndDelete(req.params.passengerId);
    res.json({ message: 'Passenger removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
