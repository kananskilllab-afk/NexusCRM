const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { Quote, PaymentSchedule, Commission } = require('../../models/voyage');
const NexusQuote = require('../../models/Quote');
const NexusInvoice = require('../../models/Invoice');
const Opportunity = require('../../models/Opportunity');
const Lead = require('../../models/Lead');

// Get all quotes (voyage + CRM persisted + virtual from all Closed-Won opps)
router.get('/quotes', authenticateToken, async (req, res) => {
  try {
    // 1. Voyage quotes (may be empty — voyage Quote requires tenant_id)
    let voyageFormatted = [];
    try {
      const voyageQuotes = await Quote.find().populate('contact_id').lean();
      voyageFormatted = voyageQuotes.map(q => ({
        id: q._id.toString(),
        quote_number: q.quote_number || `VQ-${q._id.toString().slice(-6).toUpperCase()}`,
        contact_name: q.contact_id ? q.contact_id.full_name : '—',
        total_amount: (q.total_sell_cents || 0) / 100,
        sent_date: q.created_at,
        expiry_date: q.expires_at,
        status: q.status ? (q.status.charAt(0).toUpperCase() + q.status.slice(1)) : 'Draft',
      }));
    } catch (_) { /* voyage Quote collection may not exist */ }

    // 2. CRM quotes persisted via auto-generation on Closed-Won
    const crmQuotes = await NexusQuote.find().sort({ created_at: -1 }).lean();
    const leadIds = [...new Set(crmQuotes.map(q => q.lead_id).filter(Boolean))];
    const leads = leadIds.length ? await Lead.find({ id: { $in: leadIds } }).lean() : [];
    const leadMap = {};
    leads.forEach(l => { leadMap[l.id] = l; });

    const crmFormatted = crmQuotes.map(q => {
      const lead = leadMap[q.lead_id];
      const contactName = lead
        ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
        : '—';
      return {
        id: q.id,
        quote_number: q.quote_number,
        contact_name: contactName || q.lead_id || '—',
        total_amount: q.final_total || 0,
        sent_date: q.created_at,
        expiry_date: q.valid_until || null,
        status: q.status,
      };
    });

    // 3. Closed-Won opps that don't have a persisted CRM quote yet (shown as virtual)
    const quotedLeadIds = new Set(crmQuotes.map(q => q.lead_id).filter(Boolean));
    const closedWonOpps = await Opportunity.find({
      stage: 'Closed-Won',
      lead_id: { $exists: true, $ne: null },
    }).lean();
    const virtualQuotes = closedWonOpps
      .filter(o => !quotedLeadIds.has(o.lead_id))
      .map(o => ({
        id: `vq-${o.id}`,
        quote_number: `QT-${o.opp_code || o.id.slice(-6).toUpperCase()}`,
        contact_name: o.customer_name || '—',
        total_amount: o.estimated_value || 0,
        sent_date: o.won_at || o.updated_at,
        expiry_date: null,
        status: 'Sent',
      }));

    res.json([...voyageFormatted, ...crmFormatted, ...virtualQuotes]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all invoices (voyage payment schedules + CRM persisted + virtual from all Closed-Won opps)
router.get('/invoices', authenticateToken, async (req, res) => {
  try {
    // 1. Voyage invoices from payment schedules (may be empty)
    let voyageFormatted = [];
    try {
      const schedules = await PaymentSchedule.find().populate({
        path: 'booking_id',
        populate: { path: 'contact_id' }
      }).lean();
      voyageFormatted = schedules.map(s => {
        const isPaid = s.status === 'paid';
        const total = (s.amount_cents || 0) / 100;
        const paid = isPaid ? total : 0;
        const clientName = s.booking_id?.contact_id?.full_name || 'Client';
        return {
          id: 'INV-' + s._id.toString().substring(18).toUpperCase(),
          invoice_number: 'INV-' + s._id.toString().substring(18).toUpperCase(),
          contact_name: clientName,
          total_amount: total,
          paid_amount: paid,
          outstanding: total - paid,
          due_date: s.due_date || null,
          status: isPaid ? 'Paid' : 'Pending',
        };
      });
    } catch (_) { /* voyage PaymentSchedule collection may not exist */ }

    // 2. CRM invoices persisted via auto-generation on Closed-Won
    const crmInvoices = await NexusInvoice.find().sort({ created_at: -1 }).lean();
    const invoicedLeadIds = new Set(crmInvoices.map(inv => inv.lead_id).filter(Boolean));

    const crmFormatted = crmInvoices.map(inv => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      contact_name: inv.customer_name || '—',
      total_amount: inv.grand_total || 0,
      paid_amount: inv.deposit_paid || 0,
      outstanding: inv.balance_due || 0,
      due_date: inv.balance_due_date || null,
      status: inv.status,
    }));

    // 3. Closed-Won opps that don't have a persisted CRM invoice yet (shown as virtual)
    const closedWonOpps = await Opportunity.find({
      stage: 'Closed-Won',
      lead_id: { $exists: true, $ne: null },
    }).lean();
    const virtualInvoices = closedWonOpps
      .filter(o => !invoicedLeadIds.has(o.lead_id))
      .map(o => {
        const subtotal = o.estimated_value || 0;
        const tax = +(subtotal * 0.05).toFixed(2);
        const grand = +(subtotal + tax).toFixed(2);
        return {
          id: `vi-${o.id}`,
          invoice_number: `INV-AUTO-${o.opp_code || o.id.slice(-6).toUpperCase()}`,
          contact_name: o.customer_name || '—',
          total_amount: grand,
          paid_amount: 0,
          outstanding: grand,
          due_date: o.expected_close_date || null,
          status: 'Issued',
        };
      });

    res.json([...voyageFormatted, ...crmFormatted, ...virtualInvoices]);
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
