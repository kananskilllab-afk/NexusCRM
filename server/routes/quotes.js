const express = require('express');
const router = express.Router();
const Quote = require('../models/Quote');
const Activity = require('../models/Activity');
const Lead = require('../models/Lead');
const { authenticate, requireRole, auditLog, generateId } = require('../middleware/auth');
const { ROLE_HIERARCHY } = require('./auth');

// Discount threshold (%) above which manager approval is required.
const DISCOUNT_THRESHOLD = Number(process.env.DISCOUNT_THRESHOLD_PCT || 10);
// Junior roles see no margin column.
const MARGIN_VISIBLE_FROM = 2; // Ops Staff (2) and above can see margin
const MANAGER_LEVEL = 3;       // Ops Manager and above can approve

router.use(authenticate);

function computeTotals({ items = [], discount_pct = 0 }) {
  const cost_total = items.reduce((s, i) => s + (Number(i.cost) || 0) * (Number(i.qty) || 1), 0);
  const sell_total = items.reduce((s, i) => s + (Number(i.sell) || 0) * (Number(i.qty) || 1), 0);
  const margin = sell_total - cost_total;
  const discount_amount = +((sell_total * (Number(discount_pct) || 0)) / 100).toFixed(2);
  const final_total = +(sell_total - discount_amount).toFixed(2);
  return { cost_total, sell_total, margin, discount_amount, final_total };
}

function stripMargin(quote, userRole) {
  const level = ROLE_HIERARCHY[userRole] || 0;
  if (level >= MARGIN_VISIBLE_FROM) return quote;
  const safe = { ...quote };
  delete safe.cost_total;
  delete safe.margin;
  if (Array.isArray(safe.items)) {
    safe.items = safe.items.map(i => { const { cost, ...rest } = i; return rest; });
  }
  return safe;
}

// Stage 7 — Create quote (auto-routes to Pending Approval when discount > threshold)
router.post('/', requireRole(1), async (req, res) => {
  try {
    const { lead_id, items = [], discount_pct = 0, currency = 'INR', valid_until, terms } = req.body;
    if (!lead_id) return res.status(400).json({ error: 'lead_id required' });

    const totals = computeTotals({ items, discount_pct });
    const approval_required = Number(discount_pct) > DISCOUNT_THRESHOLD;

    const quote_number = await Quote.nextQuoteNumber();
    const id = generateId('qt');
    const quote = await Quote.create({
      id,
      quote_number,
      lead_id,
      items,
      discount_pct,
      currency,
      valid_until: valid_until ? new Date(valid_until) : undefined,
      terms,
      status: approval_required ? 'Pending Approval' : 'Ready to Send',
      approval_required,
      created_by: req.user.name,
      ...totals
    });

    // Move pipeline to Quoted
    await Lead.updateOne({ id: lead_id }, { $set: { pipeline_stage: 'Quoted' } });

    await Activity.create({
      id: generateId('act'),
      lead_id,
      type: 'Quote',
      text: `Quote ${quote_number} created (₹${totals.final_total}). ${approval_required ? 'Pending manager approval — discount exceeds threshold.' : 'Ready to send.'}`,
      user_name: req.user.name
    });

    auditLog(null, req, 'CREATE', 'quotes', id, `Quote ${quote_number}`);
    res.status(201).json(stripMargin(quote.toObject(), req.user.role));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List quotes for a lead
router.get('/', async (req, res) => {
  try {
    const filter = req.query.lead_id ? { lead_id: req.query.lead_id } : {};
    const quotes = await Quote.find(filter).sort({ created_at: -1 }).lean();
    res.json(quotes.map(q => stripMargin(q, req.user.role)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const q = await Quote.findOne({ id: req.params.id }).lean();
    if (!q) return res.status(404).json({ error: 'Quote not found' });
    res.json(stripMargin(q, req.user.role));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manager approval action
router.post('/:id/approve', requireRole(MANAGER_LEVEL), async (req, res) => {
  try {
    const quote = await Quote.findOne({ id: req.params.id });
    if (!quote) return res.status(404).json({ error: 'Not found' });
    if (quote.status !== 'Pending Approval') {
      return res.status(400).json({ error: `Quote is not pending approval (${quote.status})` });
    }
    quote.status = 'Ready to Send';
    quote.approver_name = req.user.name;
    quote.approved_at = new Date();
    await quote.save();

    await Activity.create({
      id: generateId('act'),
      lead_id: quote.lead_id,
      type: 'Quote',
      text: `Quote ${quote.quote_number} approved by ${req.user.name}`,
      user_name: req.user.name
    });
    res.json(stripMargin(quote.toObject(), req.user.role));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reject', requireRole(MANAGER_LEVEL), async (req, res) => {
  try {
    const { reason } = req.body;
    const quote = await Quote.findOne({ id: req.params.id });
    if (!quote) return res.status(404).json({ error: 'Not found' });
    quote.status = 'Rejected';
    quote.rejection_reason = reason;
    quote.approver_name = req.user.name;
    await quote.save();
    await Activity.create({
      id: generateId('act'),
      lead_id: quote.lead_id,
      type: 'Quote',
      text: `Quote ${quote.quote_number} rejected by ${req.user.name}: ${reason || 'no reason'}`,
      user_name: req.user.name
    });
    res.json(stripMargin(quote.toObject(), req.user.role));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/send', requireRole(1), async (req, res) => {
  try {
    const quote = await Quote.findOne({ id: req.params.id });
    if (!quote) return res.status(404).json({ error: 'Not found' });
    if (quote.status === 'Pending Approval') {
      return res.status(400).json({ error: 'Quote needs manager approval before sending' });
    }
    quote.status = 'Sent';
    await quote.save();
    await Activity.create({
      id: generateId('act'),
      lead_id: quote.lead_id,
      type: 'Quote',
      text: `Quote ${quote.quote_number} sent to customer`,
      user_name: req.user.name
    });
    res.json(stripMargin(quote.toObject(), req.user.role));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
