const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { Booking, Contact, PipelineStage } = require('../../models/voyage');
const {
  resolveTenant,
  getOrSeedStages,
  statusForStage,
  logStageActivity,
} = require('../../utils/voyage/pipeline');

// Shape a booking for the client.
const formatBooking = (b) => {
  const sell = b.total_sell_cents || 0;
  const cost = b.total_cost_cents || 0;
  const marginPct = sell > 0 ? Math.round(((sell - cost) / sell) * 100) : 0;
  return {
    id: b._id.toString(),
    booking_ref: 'BKG-' + b._id.toString().slice(-6).toUpperCase(),
    stage_id: b.stage_id ? b.stage_id.toString() : null,
    destination: b.destination || 'Custom Trip',
    contact_name: b.contact_id ? (b.contact_id.full_name || 'Client') : 'Client',
    contact_id: b.contact_id ? (b.contact_id._id ? b.contact_id._id.toString() : b.contact_id.toString()) : null,
    last_name: b.contact_id ? (b.contact_id.full_name || 'Client') : 'Client', // legacy key
    total_sell_cents: sell,
    total_cost_cents: cost,
    margin_pct: marginPct,
    currency_code: b.currency_code || 'INR',
    status: b.status,
    priority: b.priority || 'medium',
    board_position: b.board_position || 0,
    expected_close_date: b.expected_close_date || null,
    travel_dates: b.travel_dates || null,
    segment_types: b.segment_types || [],
    segments: [],
    payments: [],
    emails: [],
    created_at: b.created_at,
    updated_at: b.updated_at,
  };
};

// ─── GET all bookings (optional ?stage=&page=&limit=) ───────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { stage, page, limit = 50 } = req.query;
    const filter = {};
    if (stage) filter.status = stage;

    const qb = Booking.find(filter)
      .populate('contact_id')
      .sort({ board_position: 1, created_at: -1 });

    if (page) {
      const p = Math.max(1, parseInt(page) || 1);
      const l = Math.min(200, parseInt(limit) || 50);
      const [bookings, total] = await Promise.all([
        qb.skip((p - 1) * l).limit(l).lean(),
        Booking.countDocuments(filter),
      ]);
      return res.json({ bookings: bookings.map(formatBooking), total, page: p, pages: Math.ceil(total / l) });
    }

    const bookings = await qb.lean();
    res.json(bookings.map(formatBooking));
  } catch (err) {
    console.error('❌ GET /bookings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET single booking ──────────────────────────────────────────────────────
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('contact_id').lean();
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(formatBooking(booking));
  } catch (err) {
    console.error('❌ GET /bookings/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── CREATE booking ──────────────────────────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
  const {
    contact_id, contact_name, destination, start_at, end_at,
    total_cost_cents, total_sell_cents, priority, expected_close_date, stage_id,
  } = req.body;

  try {
    const tenant = await resolveTenant();

    // Resolve / create the contact this booking belongs to.
    let contact = null;
    if (contact_id) contact = await Contact.findById(contact_id);
    if (!contact && contact_name && contact_name.trim()) {
      contact = await Contact.create({
        tenant_id: tenant._id,
        full_name: contact_name.trim(),
        lifecycle_stage: 'prospect',
        source: 'web',
      });
    }
    if (!contact) {
      contact = await Contact.findOne({ tenant_id: tenant._id });
      if (!contact) {
        contact = await Contact.create({
          tenant_id: tenant._id,
          full_name: 'Walk-in Client',
          lifecycle_stage: 'lead',
          source: 'web',
        });
      }
    }

    // Resolve target stage — explicit, else first stage on the board.
    const stages = await getOrSeedStages(tenant._id);
    let targetStage = stage_id ? stages.find((s) => s._id.toString() === stage_id) : null;
    if (!targetStage) targetStage = stages[0];

    // Place the new card at the top of its column.
    const top = await Booking.findOne({ stage_id: targetStage._id }).sort({ board_position: 1 });
    const board_position = top ? (top.board_position || 0) - 1 : 0;

    const newBooking = await Booking.create({
      tenant_id: tenant._id,
      contact_id: contact._id,
      stage_id: targetStage._id,
      destination: (destination && destination.trim()) || 'New Custom Trip',
      total_cost_cents: parseInt(total_cost_cents, 10) || 0,
      total_sell_cents: parseInt(total_sell_cents, 10) || 0,
      priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
      expected_close_date: expected_close_date ? new Date(expected_close_date) : undefined,
      status: statusForStage(targetStage) || 'enquiry',
      board_position,
      travel_dates: {
        start: start_at ? new Date(start_at) : undefined,
        end: end_at ? new Date(end_at) : undefined,
      },
    });

    const populated = await Booking.findById(newBooking._id).populate('contact_id').lean();
    res.status(201).json(formatBooking(populated));
  } catch (err) {
    console.error('❌ POST /bookings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE booking details ──────────────────────────────────────────────────
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      destination, total_cost_cents, total_sell_cents, priority,
      expected_close_date, contact_name, start_at, end_at, lost_reason,
    } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (destination !== undefined) booking.destination = destination;
    if (total_cost_cents !== undefined) booking.total_cost_cents = parseInt(total_cost_cents, 10) || 0;
    if (total_sell_cents !== undefined) booking.total_sell_cents = parseInt(total_sell_cents, 10) || 0;
    if (priority !== undefined && ['low', 'medium', 'high'].includes(priority)) booking.priority = priority;
    if (expected_close_date !== undefined) {
      booking.expected_close_date = expected_close_date ? new Date(expected_close_date) : null;
    }
    if (start_at !== undefined || end_at !== undefined) {
      booking.travel_dates = {
        start: start_at ? new Date(start_at) : booking.travel_dates && booking.travel_dates.start,
        end: end_at ? new Date(end_at) : booking.travel_dates && booking.travel_dates.end,
      };
    }
    if (lost_reason !== undefined) booking.lost_reason = lost_reason;

    await booking.save();

    // Keep the linked contact's display name in sync when edited inline.
    if (contact_name && contact_name.trim() && booking.contact_id) {
      await Contact.findByIdAndUpdate(booking.contact_id, { full_name: contact_name.trim() });
    }

    const populated = await Booking.findById(booking._id).populate('contact_id').lean();
    res.json(formatBooking(populated));
  } catch (err) {
    console.error('❌ PATCH /bookings/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE booking ──────────────────────────────────────────────────────────
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await Booking.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Booking not found' });
    res.json({ message: 'Booking deleted', id: req.params.id });
  } catch (err) {
    console.error('❌ DELETE /bookings/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── MOVE booking to a stage (+ optional within-column ordering) ─────────────
router.patch('/:id/stage', authenticateToken, async (req, res) => {
  const { stage_id, board_position, lost_reason } = req.body;

  try {
    const tenant = await resolveTenant();
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const targetStage = await PipelineStage.findOne({ _id: stage_id, tenant_id: tenant._id });
    if (!targetStage) return res.status(400).json({ error: 'Invalid stage' });

    const fromStage = booking.stage_id
      ? await PipelineStage.findById(booking.stage_id)
      : null;
    const stageChanged = !booking.stage_id || booking.stage_id.toString() !== stage_id;

    booking.stage_id = targetStage._id;
    if (board_position !== undefined) booking.board_position = board_position;

    // Sync lifecycle status to the new stage's semantics.
    const nextStatus = statusForStage(targetStage);
    if (nextStatus) booking.status = nextStatus;
    if (targetStage.is_closed_lost && lost_reason) booking.lost_reason = lost_reason;

    await booking.save();

    if (stageChanged) {
      await logStageActivity(req, { tenantId: tenant._id, booking, fromStage, toStage: targetStage });
    }

    const populated = await Booking.findById(booking._id).populate('contact_id').lean();
    res.json({ message: 'Booking stage updated', booking: formatBooking(populated) });
  } catch (err) {
    console.error('❌ PATCH /bookings/:id/stage error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
