const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { Quote, PaymentSchedule, Commission } = require('../../models/voyage');

// Get all quotes
router.get('/quotes', authenticateToken, async (req, res) => {
  try {
    const quotes = await Quote.find().populate('contact_id').lean();
    const formatted = quotes.map(q => ({
      id: q._id.toString(),
      contact_name: q.contact_id ? q.contact_id.full_name : '—',
      total_amount: q.total_sell_cents / 100,
      created_at: q.created_at,
      expires_at: q.expires_at,
      status: q.status.charAt(0).toUpperCase() + q.status.slice(1),
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all invoices (synthesized from payment schedules)
router.get('/invoices', authenticateToken, async (req, res) => {
  try {
    const schedules = await PaymentSchedule.find().populate({
      path: 'booking_id',
      populate: { path: 'contact_id' }
    }).lean();
    
    const formatted = schedules.map(s => {
      const isPaid = s.status === 'paid';
      const clientName = s.booking_id && s.booking_id.contact_id ? s.booking_id.contact_id.full_name : 'Client';
      return {
        id: 'INV-' + s._id.toString().substring(18).toUpperCase(),
        client: clientName,
        total: (s.amount_cents / 100).toLocaleString(),
        due: isPaid ? 0 : s.amount_cents / 100,
        dueDate: s.due_date ? new Date(s.due_date).toISOString().split('T')[0] : 'N/A',
        status: isPaid ? 'Paid' : 'Pending'
      };
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get commissions
router.get('/commissions', authenticateToken, async (req, res) => {
  try {
    const commissions = await Commission.find().populate('supplier_id').populate('booking_id').lean();
    const formatted = commissions.map(c => ({
      supplier: c.supplier_id ? c.supplier_id.name : 'Supplier',
      booking: c.booking_id ? 'BKG-' + c.booking_id._id.toString().substring(18).toUpperCase() : 'N/A',
      expected: c.expected_cents / 100,
      received: c.received_cents / 100,
      status: c.status === 'received' ? 'Settled' : 'Pending'
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
