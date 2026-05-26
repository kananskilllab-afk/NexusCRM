const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const FollowUp = require('../models/FollowUp');
const BillingItem = require('../models/BillingItem');
const Payment = require('../models/Payment');
const AssignedSupplier = require('../models/AssignedSupplier');
const Communication = require('../models/Communication');
const Customer = require('../models/Customer');
const { authenticate, requireRole, auditLog, generateId } = require('../middleware/auth');
const { ROLE_HIERARCHY } = require('./auth');
const { sendAutomatedEmail } = require('../utils/automation');

// All lead routes require authentication
router.use(authenticate);

// GET /api/leads - list all leads (filtered by role)
router.get('/', async (req, res) => {
  const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
  
  try {
    let leads;
    if (userLevel >= 3) {
      // Ops Manager and above see all leads
      leads = await Lead.find({}).sort({ created_at: -1 }).lean();
    } else if (userLevel >= 1) {
      // Ops Staff sees assigned leads only
      leads = await Lead.find({ assigned_to: req.user.name }).sort({ created_at: -1 }).lean();
    } else {
      return res.status(403).json({ error: 'No lead access' });
    }

    // Dynamic populate of follow-ups for each retrieved lead
    const leadIds = leads.map(l => l.id);
    const allFollowUps = await FollowUp.find({ lead_id: { $in: leadIds } }).lean();
    
    const followUpsMap = {};
    allFollowUps.forEach(f => {
      if (!followUpsMap[f.lead_id]) followUpsMap[f.lead_id] = [];
      followUpsMap[f.lead_id].push(f);
    });

    const leadsWithFollowUps = leads.map(l => ({
      ...l,
      followUps: followUpsMap[l.id] || []
    }));

    res.json(leadsWithFollowUps);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list leads' });
  }
});

// GET /api/leads/:id - single lead with full detail
router.get('/:id', async (req, res) => {
  const leadId = req.params.id;

  try {
    const lead = await Lead.findOne({ id: leadId }).lean();
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const activities = await Activity.find({ lead_id: leadId }).sort({ created_at: -1 }).lean();
    const followUps = await FollowUp.find({ lead_id: leadId }).sort({ date: -1 }).lean();
    const billingItems = await BillingItem.find({ lead_id: leadId }).lean();
    const payments = await Payment.find({ lead_id: leadId }).sort({ date: -1 }).lean();
    const assignedSuppliers = await AssignedSupplier.find({ lead_id: leadId }).lean();
    const communications = await Communication.find({ lead_id: leadId }).sort({ sent_at: -1 }).lean();

    res.json({
      ...lead,
      activities,
      followUps,
      billing: { items: billingItems, payments },
      assignedSuppliers,
      communications
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve lead details' });
  }
});

// POST /api/leads - create lead
router.post('/', requireRole(1), async (req, res) => {
  const id = generateId('L');
  const {
    first_name, last_name, email, mobile, status = 'New', priority = 'Normal',
    no_adults = 1, no_children = 0, no_infants = 0, destination, lead_source,
    assigned_to, travel_start_date, travel_end_date,
    enquiry_types = [], enquiry_data = {}, notes, tags = []
  } = req.body;

  try {
    const newLead = await Lead.create({
      id, first_name, last_name, email, mobile, status, priority,
      no_adults, no_children, no_infants, destination, lead_source,
      assigned_to: assigned_to || req.user.name, travel_start_date, travel_end_date,
      enquiry_types, enquiry_data, notes, tags
    });

    // Auto-create activity
    await Activity.create({
      id: generateId('act'),
      lead_id: id,
      type: 'System',
      text: `Lead created by ${req.user.name}`,
      user_name: req.user.name
    });

    auditLog(null, req, 'CREATE', 'leads', id, `Lead created: ${first_name} ${last_name}`);

    // Trigger automated welcome email
    sendAutomatedEmail(newLead, 'Enquiry Welcome');

    res.status(201).json(newLead);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// PATCH /api/leads/:id - update lead
router.patch('/:id', requireRole(1), async (req, res) => {
  const leadId = req.params.id;

  try {
    const lead = await Lead.findOne({ id: leadId });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const allowed = ['first_name','last_name','email','mobile','status','priority','destination',
      'lead_source','assigned_to','travel_start_date','travel_end_date','enquiry_types',
      'enquiry_data','no_adults','no_children','no_infants','notes','tags'];

    const updates = {};
    allowed.forEach(key => {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) return res.json(lead);

    const updated = await Lead.findOneAndUpdate(
      { id: leadId },
      { $set: updates },
      { new: true }
    );

    // If status changed, log it
    if (req.body.status && req.body.status !== lead.status) {
      await Activity.create({
        id: generateId('act'),
        lead_id: leadId,
        type: 'Status',
        text: `Status changed: ${lead.status} → ${req.body.status}`,
        user_name: req.user.name
      });

      // Trigger automated booking confirmation email
      if (req.body.status === 'Booked') {
        sendAutomatedEmail(updated, 'Booking Confirmation');
      }
    }

    auditLog(null, req, 'UPDATE', 'leads', leadId, `Lead updated`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', requireRole(4), async (req, res) => {
  const leadId = req.params.id;

  try {
    await Lead.deleteOne({ id: leadId });
    auditLog(null, req, 'DELETE', 'leads', leadId, 'Lead deleted');
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// PUT /api/leads/:id/cancel - cancel booking and calculate refund
router.put('/:id/cancel', requireRole(1), async (req, res) => {
  const leadId = req.params.id;

  try {
    const lead = await Lead.findOne({ id: leadId });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Calculate refund (sum of all received payments)
    const payments = await Payment.find({ lead_id: leadId, type: 'received' });
    const refundAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Update status
    await Lead.updateOne({ id: leadId }, { $set: { status: 'Cancelled' } });

    // Log activity
    await Activity.create({
      id: generateId('act'),
      lead_id: leadId,
      type: 'Status',
      text: `Booking Cancelled. Refund of ${refundAmount} calculated.`,
      user_name: req.user.name
    });

    // Send automated cancellation email if customer exists and notifications are enabled
    const customer = await Customer.findOne({ email: lead.email });
    if (customer && customer.notification_enabled) {
      sendAutomatedEmail(lead, 'Booking Cancelled', { 
        refund_amount: `₹${refundAmount.toLocaleString()}` 
      });
    }

    auditLog(null, req, 'CANCEL', 'leads', leadId, `Booking cancelled. Refund: ${refundAmount}`);
    res.json({ success: true, refundAmount, status: 'Cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/:id/activities - add activity note
router.post('/:id/activities', async (req, res) => {
  const leadId = req.params.id;
  const id = generateId('act');
  const { text, type = 'Note' } = req.body;

  try {
    const newAct = await Activity.create({
      id,
      lead_id: leadId,
      type,
      text,
      user_name: req.user.name
    });
    res.status(201).json(newAct);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// GET /api/leads/:id/activities
router.get('/:id/activities', async (req, res) => {
  try {
    const activities = await Activity.find({ lead_id: req.params.id }).sort({ created_at: -1 }).lean();
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// POST /api/leads/:id/payments
router.post('/:id/payments', requireRole(1), async (req, res) => {
  const leadId = req.params.id;
  const id = generateId('pay');
  const { amount, date, method, reference, note } = req.body;

  try {
    const newPay = await Payment.create({
      id,
      lead_id: leadId,
      amount,
      date: date || new Date().toISOString(),
      method,
      reference,
      note,
      created_by: req.user.name
    });

    // Auto activity
    await Activity.create({
      id: generateId('act'),
      lead_id: leadId,
      type: 'Payment',
      text: `Payment of ₹${Number(amount).toLocaleString()} received via ${method}`,
      user_name: req.user.name
    });

    auditLog(null, req, 'PAYMENT', 'payments', id, `Payment: ₹${amount}`);

    // Trigger automated payment receipt email (using Payment Reminder template)
    const leadDoc = await Lead.findOne({ id: leadId });
    if (leadDoc) {
      sendAutomatedEmail(leadDoc, 'Payment Reminder', {
        amount: `₹${Number(amount).toLocaleString()}`,
        due_date: new Date(newPay.date).toLocaleDateString()
      });
    }

    res.status(201).json(newPay);
  } catch (err) {
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// GET /api/leads/:id/payments
router.get('/:id/payments', async (req, res) => {
  try {
    const payments = await Payment.find({ lead_id: req.params.id }).sort({ date: -1 }).lean();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list payments' });
  }
});

// POST /api/leads/:id/billing-items
router.post('/:id/billing-items', requireRole(1), async (req, res) => {
  const leadId = req.params.id;
  const id = generateId('item');
  const { description, qty, price, tax } = req.body;

  try {
    const newItem = await BillingItem.create({
      id,
      lead_id: leadId,
      description,
      qty: qty || 1,
      price: price || 0,
      tax: tax || 0
    });
    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add billing item' });
  }
});

// GET /api/leads/:id/billing-items
router.get('/:id/billing-items', async (req, res) => {
  try {
    const items = await BillingItem.find({ lead_id: req.params.id }).lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list billing items' });
  }
});

// DELETE /api/leads/:id/billing-items/:itemId
router.delete('/:id/billing-items/:itemId', requireRole(1), async (req, res) => {
  try {
    const result = await BillingItem.deleteOne({ lead_id: req.params.id, id: req.params.itemId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Billing item not found' });
    }
    res.json({ message: 'Billing item deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete billing item' });
  }
});

// POST /api/leads/:id/follow-ups
router.post('/:id/follow-ups', requireRole(1), async (req, res) => {
  const leadId = req.params.id;
  const id = generateId('fu');
  const { date, method, notes, outcome, next_date } = req.body;

  try {
    const newFu = await FollowUp.create({
      id,
      lead_id: leadId,
      date,
      method: method || 'Phone',
      notes,
      outcome,
      next_date,
      created_by: req.user.name
    });

    await Activity.create({
      id: generateId('act'),
      lead_id: leadId,
      type: 'FollowUp',
      text: `Follow-up scheduled via ${method}: ${notes || ''}`,
      user_name: req.user.name
    });

    res.status(201).json(newFu);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save follow-up' });
  }
});

// GET /api/leads/:id/follow-ups
router.get('/:id/follow-ups', async (req, res) => {
  try {
    const followUps = await FollowUp.find({ lead_id: req.params.id }).sort({ date: -1 }).lean();
    res.json(followUps);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list follow-ups' });
  }
});

// POST /api/leads/:id/assign-supplier
router.post('/:id/assign-supplier', requireRole(2), async (req, res) => {
  const leadId = req.params.id;
  const id = generateId('as');
  const { supplier_name, service_type, rate, markup, currency, supplier_id } = req.body;

  try {
    const newAs = await AssignedSupplier.create({
      id,
      lead_id: leadId,
      supplier_id,
      supplier_name,
      service_type,
      rate,
      markup: markup || 0,
      currency: currency || 'INR'
    });

    await Activity.create({
      id: generateId('act'),
      lead_id: leadId,
      type: 'Supplier',
      text: `Supplier assigned: ${supplier_name} for ${service_type} @ ₹${rate}`,
      user_name: req.user.name
    });

    res.status(201).json(newAs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign supplier' });
  }
});

// POST /api/leads/:id/communications
router.post('/:id/communications', requireRole(1), async (req, res) => {
  const leadId = req.params.id;
  const id = generateId('comm');
  const { channel, content, template_name, direction } = req.body;

  try {
    const newComm = await Communication.create({
      id,
      lead_id: leadId,
      channel,
      direction: direction || 'outbound',
      template_name,
      content,
      sent_by: req.user.name
    });

    await Activity.create({
      id: generateId('act'),
      lead_id: leadId,
      type: 'Communication',
      text: `${channel} sent: ${template_name || 'Custom message'}`,
      user_name: req.user.name
    });

    res.status(201).json(newComm);
  } catch (err) {
    res.status(500).json({ error: 'Failed to log communication' });
  }
});

// GET /api/leads/:id/communications
router.get('/:id/communications', async (req, res) => {
  try {
    const comms = await Communication.find({ lead_id: req.params.id }).sort({ sent_at: -1 }).lean();
    res.json(comms);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list communications' });
  }
});

module.exports = router;
