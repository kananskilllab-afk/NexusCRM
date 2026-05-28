const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { BookingSegment } = require('../../models/voyage');

// GET /api/voyage/segments/:bookingId — list segments for a booking
router.get('/:bookingId', authenticateToken, async (req, res) => {
  try {
    const segments = await BookingSegment.find({ booking_id: req.params.bookingId })
      .populate('supplier_id', 'name type')
      .lean();
    const formatted = segments.map(s => ({
      id: s._id.toString(),
      booking_id: s.booking_id.toString(),
      supplier: s.supplier_id ? s.supplier_id.name : 'N/A',
      supplier_type: s.supplier_id ? s.supplier_id.type : '',
      segment_type: s.segment_type,
      status: s.status,
      is_on_request: s.is_on_request,
      start_at: s.start_at ? new Date(s.start_at).toISOString().split('T')[0] : '',
      end_at: s.end_at ? new Date(s.end_at).toISOString().split('T')[0] : '',
      cost_cents: s.cost_cents,
      sell_cents: s.sell_cents,
      margin_cents: s.sell_cents - s.cost_cents,
      margin_pct: s.sell_cents > 0 ? (((s.sell_cents - s.cost_cents) / s.sell_cents) * 100).toFixed(1) : '0.0',
      confirmation_ref: s.confirmation_ref || '',
      supplier_ref: s.supplier_ref || '',
      cancellation_policy: s.cancellation_policy || '',
      metadata: s.metadata || {}
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/voyage/segments/:bookingId — add a segment
router.post('/:bookingId', authenticateToken, async (req, res) => {
  const { segment_type, supplier_id, start_at, end_at, cost_cents, sell_cents, confirmation_ref, supplier_ref, cancellation_policy, status, is_on_request } = req.body;
  try {
    const segment = await BookingSegment.create({
      booking_id: req.params.bookingId,
      supplier_id: supplier_id || undefined,
      segment_type,
      status: status || 'pending',
      is_on_request: is_on_request || false,
      start_at: start_at ? new Date(start_at) : undefined,
      end_at: end_at ? new Date(end_at) : undefined,
      cost_cents: cost_cents || 0,
      sell_cents: sell_cents || 0,
      confirmation_ref,
      supplier_ref,
      cancellation_policy
    });
    res.status(201).json({ id: segment._id.toString(), message: 'Segment added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/voyage/segments/:bookingId/:segmentId — update a segment
router.put('/:bookingId/:segmentId', authenticateToken, async (req, res) => {
  try {
    const updated = await BookingSegment.findByIdAndUpdate(req.params.segmentId, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Segment not found' });
    res.json({ message: 'Segment updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/voyage/segments/:bookingId/:segmentId
router.delete('/:bookingId/:segmentId', authenticateToken, async (req, res) => {
  try {
    await BookingSegment.findByIdAndDelete(req.params.segmentId);
    res.json({ message: 'Segment removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
