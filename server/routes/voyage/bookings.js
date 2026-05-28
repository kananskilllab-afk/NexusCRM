const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { Booking, Contact, Tenant, PipelineStage } = require('../../models/voyage');

// Get all bookings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.find().populate('contact_id').lean();
    
    // Map to the flat structure expected by the frontend
    const formatted = bookings.map(b => ({
      id: b._id.toString(),
      stage_id: b.stage_id ? b.stage_id.toString() : null,
      destination: b.destination || 'Custom Trip',
      last_name: b.contact_id ? b.contact_id.full_name : 'Client',
      total_sell_cents: b.total_sell_cents,
      status: b.status,
      travel_dates: b.travel_dates,
      currency_code: b.currency_code
    }));
    
    res.json(formatted);
  } catch (err) {
    console.error('❌ GET /bookings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create new booking
router.post('/', authenticateToken, async (req, res) => {
  const { contact_id, reference, destination, start_at, end_at, total_cost_cents, total_sell_cents } = req.body;
  
  try {
    // 1. Resolve Tenant — auto-seed if none exists
    let tenant = await Tenant.findOne();
    if (!tenant) {
      tenant = await Tenant.create({
        name: 'Voyage Elite Travel',
        plan: 'enterprise',
        settings: { currency: 'INR', timezone: 'Asia/Kolkata', logo_url: '' }
      });
      console.log('🌱 Auto-seeded default Tenant for booking creation.');
    }
    
    // 2. Resolve Contact
    let contact;
    if (contact_id) {
      contact = await Contact.findById(contact_id);
    }
    if (!contact) {
      // Find any existing contact, or create a walk-in
      contact = await Contact.findOne({ tenant_id: tenant._id });
      if (!contact) {
        contact = await Contact.create({
          tenant_id: tenant._id,
          full_name: 'Walk-in Client',
          lifecycle_stage: 'lead',
          source: 'web'
        });
        console.log('🌱 Auto-seeded Walk-in Contact for booking creation.');
      }
    }
    
    // 3. Resolve default Pipeline Stage (first stage = Enquiry)
    let defaultStage = await PipelineStage.findOne({ tenant_id: tenant._id }).sort({ position: 1 });
    if (!defaultStage) {
      // Auto-seed pipeline stages
      await PipelineStage.insertMany([
        { tenant_id: tenant._id, name: 'Enquiry',   position: 1, is_closed_won: false },
        { tenant_id: tenant._id, name: 'Proposal',  position: 2, is_closed_won: false },
        { tenant_id: tenant._id, name: 'Confirmed', position: 3, is_closed_won: true  },
        { tenant_id: tenant._id, name: 'Completed', position: 4, is_closed_won: true  },
      ]);
      defaultStage = await PipelineStage.findOne({ tenant_id: tenant._id }).sort({ position: 1 });
      console.log('🌱 Auto-seeded Pipeline Stages for booking creation.');
    }
    
    const newBooking = await Booking.create({
      tenant_id: tenant._id,
      contact_id: contact._id,
      stage_id: defaultStage._id,
      destination: destination || 'New Custom Trip',
      total_cost_cents: total_cost_cents || 0,
      total_sell_cents: total_sell_cents || 0,
      status: 'enquiry',
      travel_dates: {
        start: start_at ? new Date(start_at) : new Date(),
        end: end_at ? new Date(end_at) : new Date(Date.now() + 7 * 86400000)
      }
    });
    
    console.log(`✅ Booking created: ${newBooking._id} → ${destination || 'New Custom Trip'}`);
    res.status(201).json({ id: newBooking._id.toString(), reference, message: 'Booking created successfully' });
  } catch (err) {
    console.error('❌ POST /bookings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update booking stage
router.patch('/:id/stage', authenticateToken, async (req, res) => {
  const { stage_id } = req.body;
  const booking_id = req.params.id;
  
  try {
    const updated = await Booking.findByIdAndUpdate(
      booking_id,
      { stage_id, updated_at: new Date() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Booking not found' });
    res.json({ message: 'Booking stage updated', booking: updated });
  } catch (err) {
    console.error('❌ PATCH /bookings/:id/stage error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

