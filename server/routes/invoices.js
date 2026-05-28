const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Quote = require('../models/Quote');
const Lead = require('../models/Lead');
const Payment = require('../models/Payment');
const Activity = require('../models/Activity');
const { authenticate, requireRole, auditLog, generateId } = require('../middleware/auth');

router.use(authenticate);

// Indian GST: home state -> CGST+SGST, other state -> IGST
function computeGst({ subtotal, place_of_supply, home_state = process.env.HOME_STATE || 'Gujarat', rate = 0.05 }) {
  const tax_total = +(subtotal * rate).toFixed(2);
  const sameState = (place_of_supply || '').trim().toLowerCase() === home_state.trim().toLowerCase();
  if (sameState) {
    const half = +(tax_total / 2).toFixed(2);
    return { cgst: half, sgst: half, igst: 0, tax_total };
  }
  return { cgst: 0, sgst: 0, igst: tax_total, tax_total };
}

// Stage 9 — Issue invoice from approved quote (or from lead+items)
router.post('/', requireRole(1), async (req, res) => {
  try {
    const {
      lead_id, quote_id, gstin, place_of_supply, items = [],
      deposit_paid = 0, balance_due_date, gst_rate = 0.05,
      supplier_confirmations = []
    } = req.body;

    if (!lead_id) return res.status(400).json({ error: 'lead_id required' });
    const lead = await Lead.findOne({ id: lead_id });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    let workingItems = items;
    if (quote_id && (!items || items.length === 0)) {
      const q = await Quote.findOne({ id: quote_id });
      if (!q) return res.status(404).json({ error: 'Quote not found' });
      if (q.status === 'Pending Approval') {
        return res.status(400).json({ error: 'Cannot invoice an unapproved quote' });
      }
      workingItems = q.items;
    }

    const subtotal = workingItems.reduce((s, i) => s + ((Number(i.sell) || Number(i.price) || 0) * (Number(i.qty) || 1)), 0);
    const gst = computeGst({ subtotal, place_of_supply, rate: gst_rate });
    const grand_total = +(subtotal + gst.tax_total).toFixed(2);
    const balance_due = +(grand_total - Number(deposit_paid)).toFixed(2);

    const invoice_number = await Invoice.nextInvoiceNumber();
    const id = generateId('inv');
    const invoice = await Invoice.create({
      id, invoice_number, lead_id, quote_id,
      customer_name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
      customer_email: lead.email,
      gstin: gstin || lead.gstin,
      place_of_supply: place_of_supply || lead.place_of_supply,
      items: workingItems,
      subtotal, ...gst, grand_total,
      deposit_paid, balance_due,
      balance_due_date: balance_due_date ? new Date(balance_due_date) : undefined,
      status: deposit_paid >= grand_total ? 'Paid' : (deposit_paid > 0 ? 'Partially Paid' : 'Issued'),
      issued_at: new Date(),
      supplier_confirmations,
      created_by: req.user.name
    });

    if (Number(deposit_paid) > 0) {
      await Payment.create({
        id: generateId('pay'),
        lead_id,
        amount: Number(deposit_paid),
        date: new Date().toISOString(),
        method: 'Deposit',
        reference: invoice_number,
        note: 'Deposit at invoice issue',
        created_by: req.user.name
      });
    }

    await Lead.updateOne({ id: lead_id }, { $set: {
      status: 'Booked',
      pipeline_stage: 'Won',
      gstin: invoice.gstin,
      place_of_supply: invoice.place_of_supply
    } });

    await Activity.create({
      id: generateId('act'),
      lead_id,
      type: 'Invoice',
      text: `Invoice ${invoice_number} issued for ₹${grand_total}. GST ₹${gst.tax_total}. Deposit ₹${deposit_paid}.`,
      user_name: req.user.name
    });

    auditLog(null, req, 'CREATE', 'invoices', id, `Invoice ${invoice_number}`);
    res.status(201).json(invoice);
  } catch (err) {
    console.error('Invoice error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const filter = req.query.lead_id ? { lead_id: req.query.lead_id } : {};
    const invoices = await Invoice.find(filter).sort({ created_at: -1 }).lean();
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const inv = await Invoice.findOne({ id: req.params.id }).lean();
    if (!inv) return res.status(404).json({ error: 'Not found' });
    res.json(inv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stage 10 — Record supplier confirmation reference per segment
router.post('/:id/supplier-confirmation', requireRole(1), async (req, res) => {
  try {
    const { supplier, ref, segment, notes } = req.body;
    const inv = await Invoice.findOne({ id: req.params.id });
    if (!inv) return res.status(404).json({ error: 'Not found' });
    inv.supplier_confirmations.push({ supplier, ref, segment, notes, at: new Date() });
    await inv.save();

    await Activity.create({
      id: generateId('act'),
      lead_id: inv.lead_id,
      type: 'Supplier',
      text: `Supplier confirmation logged: ${supplier} (${segment}) — ${ref}`,
      user_name: req.user.name
    });
    res.json(inv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
