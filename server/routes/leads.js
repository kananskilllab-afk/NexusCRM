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
const Opportunity = require('../models/Opportunity');
const { authenticate, requireRole, auditLog, generateId } = require('../middleware/auth');
const { ROLE_HIERARCHY } = require('./auth');
const { sendAutomatedEmail } = require('../utils/automation');
const { scoreLead, ratingForScore } = require('../utils/leadScoring');
const { pickAgent } = require('../utils/assignment');
const { createNotification } = require('../utils/notify');
const crypto = require('crypto');
const LoyaltyPoints = require('../models/LoyaltyPoints');

// All lead routes require authentication
router.use(authenticate);

// GET /api/leads - list all leads (filtered by role)
router.get('/', async (req, res) => {
  const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
  
  try {
    let leads;
    if (userLevel >= 1) {
      // Allow counselors and managers to view all agency leads for office-wide coordination
      leads = await Lead.find({}).sort({ created_at: -1 }).lean();
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

// GET /api/leads/reminders/due - retrieve leads/followups due today or overdue
router.get('/reminders/due', async (req, res) => {
  const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
  try {
    const now = new Date();
    // End of today
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const query = {
      status: { $nin: ['Converted', 'Lost', 'Cancelled', 'Unqualified'] }
    };
    if (userLevel < 3) {
      query.assigned_to = req.user.name;
    }

    // Leads where next_follow_up_date is <= end of today
    query.next_follow_up_date = { $lte: endOfToday, $ne: null };

    const dueLeads = await Lead.find(query)
      .select('id lead_code first_name last_name mobile destination next_follow_up_date priority status assigned_to')
      .sort({ next_follow_up_date: 1 })
      .limit(20)
      .lean();

    res.json({
      count: dueLeads.length,
      items: dueLeads
    });
  } catch (err) {
    console.error('Error fetching due reminders:', err);
    res.status(500).json({ error: 'Failed to fetch due reminders' });
  }
});

// GET /api/leads/:id - single lead with full detail
router.get('/:id', async (req, res) => {
  const leadId = req.params.id;

  try {
    const lead = await Lead.findOne({ $or: [{ id: leadId }, { lead_code: leadId }] }).lean();
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const leadIds = [lead.id, lead.lead_code].filter(Boolean);
    const activities = await Activity.find({ lead_id: { $in: leadIds } }).sort({ created_at: -1 }).lean();
    const followUps = await FollowUp.find({ lead_id: { $in: leadIds } }).sort({ date: -1 }).lean();
    const billingItems = await BillingItem.find({ lead_id: { $in: leadIds } }).lean();
    const payments = await Payment.find({ lead_id: { $in: leadIds } }).sort({ date: -1 }).lean();
    const assignedSuppliers = await AssignedSupplier.find({ lead_id: { $in: leadIds } }).lean();
    const communications = await Communication.find({ lead_id: { $in: leadIds } }).sort({ sent_at: -1 }).lean();

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

// POST /api/leads - create lead (Stages 1-4)
router.post('/', requireRole(1), async (req, res) => {
  const id = generateId('L');
  const {
    first_name, last_name, email, mobile, alternate_phone, status = 'New', priority = 'Normal',
    no_adults = 1, no_children = 0, no_infants = 0, destination, lead_source,
    assigned_to, travel_start_date, travel_end_date,
    budget_range, preferred_channel, do_not_contact, next_follow_up_date,
    region, language,
    enquiry_types = [], add_on_services = [], passport_expiry_date, snooze_until,
    enquiry_data = {}, notes, tags = [], travellers = [],
    utm_source, utm_medium, utm_campaign, referrer_url,
    auto_assign = true
  } = req.body;

  try {
    // Duplicate Lead Detection (Avoid adding same details twice)
    const cleanMobile = (mobile || '').replace(/[^0-9]/g, '');
    if (cleanMobile.length >= 10 && !req.body.allow_duplicate) {
      const last10 = cleanMobile.slice(-10);
      const existing = await Lead.findOne({
        mobile: { $regex: last10 + '$' },
        status: { $nin: ['Lost', 'Cancelled'] }
      }).select('id lead_code first_name last_name mobile status assigned_to created_at').lean();

      if (existing) {
        return res.status(409).json({
          error: `Duplicate inquiry detected: An active lead with phone ending in ${last10} already exists (#${existing.lead_code || existing.id} - ${existing.first_name} ${existing.last_name || ''}, Status: ${existing.status}, Assigned to: ${existing.assigned_to || 'Unassigned'}). Check "Allow Duplicate" if this is a separate trip.`,
          duplicateLead: existing
        });
      }
    }

    // Stage 2 — Lead Code (LD-100001)
    const lead_code = await Lead.nextLeadCode();

    // Stage 3 — Lead Assignment (Round-robin disabled by default)
    let finalAssignedTo = assigned_to || null;
    const isRoundRobinOn = process.env.ROUND_ROBIN_ENABLED === 'true';
    if (!finalAssignedTo && auto_assign && isRoundRobinOn) {
      const agent = await pickAgent({ enquiry_types, region, language });
      finalAssignedTo = agent ? agent.name : req.user.name;
    } else if (!finalAssignedTo) {
      finalAssignedTo = req.user.name;
    }

    // Stage 4 — Lead score (initial, no engagement yet) + Rating band
    const initialScore = scoreLead(
      { lead_source, enquiry_data, enquiry_types, budget_range, no_adults, no_children, created_at: new Date() },
      { touchpoints: 0 }
    );

    const newLead = await Lead.create({
      id, lead_code, first_name, last_name, email, mobile, alternate_phone, status, priority,
      no_adults, no_children, no_infants, destination, lead_source,
      assigned_to: finalAssignedTo, owner: req.user.name, travel_start_date, travel_end_date,
      budget_range, preferred_channel, do_not_contact, next_follow_up_date,
      region, language,
      enquiry_types, add_on_services, passport_expiry_date, snooze_until,
      enquiry_data, notes, tags, travellers,
      utm_source, utm_medium, utm_campaign, referrer_url,
      lead_score: initialScore,
      rating: ratingForScore(initialScore),
      pipeline_stage: 'Inquiry'
    });

    // Auto-create activity (Stage 1 capture audit)
    await Activity.create({
      id: generateId('act'),
      lead_id: id,
      type: 'System',
      text: `Lead ${lead_code} captured (source: ${lead_source || 'Unknown'}). Auto-assigned to ${finalAssignedTo}.`,
      user_name: req.user.name
    });

    auditLog(null, req, 'CREATE', 'leads', id, `Lead ${lead_code} created: ${first_name} ${last_name}`);

    // Trigger automated welcome email
    sendAutomatedEmail(newLead, 'Enquiry Welcome');

    res.status(201).json(newLead);
  } catch (err) {
    console.error('Create lead failed:', err);
    let errMsg = err.message || 'Failed to create lead';
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      errMsg = `A record with this ${field} already exists.`;
    }
    res.status(400).json({ error: errMsg });
  }
});

// GET /api/leads/:id/followups - get all date-wise remarks/followups for a lead
router.get('/:id/followups', requireRole(1), async (req, res) => {
  const leadId = req.params.id;
  try {
    const lead = await Lead.findOne({ $or: [{ id: leadId }, { lead_code: leadId }] }).lean();
    const leadIds = lead ? [lead.id, lead.lead_code].filter(Boolean) : [leadId];
    const followUps = await FollowUp.find({ lead_id: { $in: leadIds } })
      .sort({ created_at: -1, date: -1 })
      .lean();
    res.json(followUps);
  } catch (err) {
    console.error('Fetch followups error:', err);
    res.status(500).json({ error: 'Failed to fetch remarks/follow-ups' });
  }
});

// POST /api/leads/:id/followups - save follow-up remark and update reminder date
router.post('/:id/followups', requireRole(1), async (req, res) => {
  const leadId = req.params.id;
  const { method = 'Phone', notes, outcome, nextDate, next_date } = req.body;

  if (!notes || !notes.trim()) {
    return res.status(400).json({ error: 'Follow-up notes/remarks are required.' });
  }

  try {
    const lead = await Lead.findOne({ $or: [{ id: leadId }, { lead_code: leadId }] });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const fuId = generateId('fu');
    const scheduledNext = nextDate || next_date || null;
    const nowIso = new Date().toISOString();

    const followUp = await FollowUp.create({
      id: fuId,
      lead_id: lead.id,
      date: nowIso,
      method,
      notes: notes.trim(),
      outcome: outcome || 'Interested',
      next_date: scheduledNext,
      status: 'Pending',
      created_by: req.user.name
    });

    // Update latest remark/notes and next_follow_up_date on the Lead
    lead.notes = notes.trim();
    if (scheduledNext) {
      lead.next_follow_up_date = new Date(scheduledNext);
    }
    await lead.save();

    // Log Activity for lead timeline
    await Activity.create({
      id: generateId('act'),
      lead_id: lead.id,
      type: 'Follow-Up',
      text: `${method} remark: "${notes.trim().slice(0, 100)}" (Outcome: ${outcome || 'Done'})`,
      user_name: req.user.name
    });

    auditLog(null, req, 'CREATE', 'followups', fuId, `Remark logged on lead ${lead.lead_code || lead.id}`);

    res.status(201).json({ success: true, followUp, lead });
  } catch (err) {
    console.error('Save follow-up error:', err);
    res.status(500).json({ error: err.message || 'Failed to save follow-up' });
  }
});

// GET /api/leads/:id/followups - get all follow-ups for a lead
router.get('/:id/followups', async (req, res) => {
  try {
    const followUps = await FollowUp.find({ lead_id: req.params.id }).sort({ date: -1 }).lean();
    res.json(followUps);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve follow-ups' });
  }
});

// PATCH /api/leads/:id - update lead
router.patch('/:id', requireRole(1), async (req, res) => {
  const leadId = req.params.id;
  const userLevel = ROLE_HIERARCHY[req.user?.role] || 0;

  try {
    const lead = await Lead.findOne({ $or: [{ id: leadId }, { lead_code: leadId }] });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Check ownership for counselors (Ops Staff / level 2 and below)
    const isOwner = lead.assigned_to === req.user?.name || lead.owner === req.user?.name;
    if (userLevel < 3 && !isOwner) {
      // Allow updating ONLY notes or next_follow_up_date if adding remark from collaborative desk
      const nonRemarkKeys = Object.keys(req.body).filter(k => !['notes', 'next_follow_up_date'].includes(k));
      if (nonRemarkKeys.length > 0) {
        return res.status(403).json({ 
          error: `Lead is assigned to ${lead.assigned_to || lead.owner || 'another counselor'}. You have read-only access to protect lead ownership.` 
        });
      }
    }

    // §4.5 — once converted, the lead is read-only; the opportunity carries work forward.
    if (lead.status === 'Converted') {
      return res.status(409).json({ error: 'Lead is converted and read-only. Edit the linked opportunity instead.' });
    }

    const allowed = ['first_name','last_name','email','mobile','alternate_phone','status','priority','destination',
      'lead_source','assigned_to','owner','travel_start_date','travel_end_date','enquiry_types',
      'enquiry_data','no_adults','no_children','no_infants','notes','tags',
      'budget_range','preferred_channel','do_not_contact','next_follow_up_date','region','language',
      'utm_source','utm_medium','utm_campaign','referrer_url',
      'qualification_status','qualification_reason','lost_reason','lead_score',
      'pipeline_stage','gstin','place_of_supply',
      'add_on_services','passport_expiry_date','snooze_until','travellers'];

    const updates = {};
    allowed.forEach(key => {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    // Keep the Rating band in sync whenever the score changes.
    if (updates.lead_score !== undefined) {
      updates.rating = ratingForScore(updates.lead_score);
    }

    if (Object.keys(updates).length === 0) return res.json(lead);

    const updated = await Lead.findOneAndUpdate(
      { _id: lead._id },
      { $set: updates },
      { new: true }
    );

    // If status changed, log it
    if (req.body.status && req.body.status !== lead.status) {
      const reasonSuffix = req.body.lost_reason ? ` (Reason: ${req.body.lost_reason})` : '';
      await Activity.create({
        id: generateId('act'),
        lead_id: lead.id,
        type: 'Status',
        text: `Status changed: ${lead.status} → ${req.body.status}${reasonSuffix}`,
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

    // §3.7 — any new engagement re-activates a nurturing lead: it jumps back
    // into the active queue with a refreshed score.
    const lead = await Lead.findOne({ id: leadId });
    if (lead && lead.status === 'Nurturing') {
      const touchpoints = await Activity.countDocuments({ lead_id: leadId, type: { $nin: ['System'] } });
      lead.status = 'Working';
      lead.lead_score = scoreLead(lead.toObject(), { touchpoints, connected: true });
      lead.rating = ratingForScore(lead.lead_score);
      await lead.save();
      await Activity.create({
        id: generateId('act'), lead_id: leadId, type: 'System',
        text: 'Re-activated from Nurturing — new engagement detected.', user_name: 'System',
      });
      if (lead.assigned_to) {
        createNotification({
          user_id: lead.assigned_to,
          title: `Lead re-activated: ${lead.lead_code || lead.id}`,
          message: `${lead.first_name || 'Lead'} responded and is back in your active queue.`,
          type: 'info', lead_id: leadId, entity_type: 'lead', entity_id: leadId, link: `/leads/${leadId}`,
        }).catch(() => {});
      }
    }

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
router.post('/:id/assign-supplier', requireRole(1), async (req, res) => {
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

// ============================================================================
// Stage 3 — Manual re-assignment via round-robin
// ============================================================================
router.post('/:id/auto-assign', requireRole(2), async (req, res) => {
  try {
    const lead = await Lead.findOne({ id: req.params.id });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const agent = await pickAgent({ enquiry_types: lead.enquiry_types || [] });
    if (!agent) return res.status(404).json({ error: 'No eligible agent available' });

    lead.assigned_to = agent.name;
    await lead.save();

    await Activity.create({
      id: generateId('act'),
      lead_id: lead.id,
      type: 'Assignment',
      text: `Round-robin reassigned to ${agent.name}`,
      user_name: req.user.name
    });

    auditLog(null, req, 'ASSIGN', 'leads', lead.id, `Reassigned to ${agent.name}`);
    res.json({ assigned_to: agent.name, lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Manual assign — set the working agent and/or the owner explicitly.
// ============================================================================
router.post('/:id/assign', requireRole(1), async (req, res) => {
  const { assigned_to, owner } = req.body;
  try {
    const lead = await Lead.findOne({ id: req.params.id });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (lead.status === 'Converted') {
      return res.status(409).json({ error: 'Lead is converted and read-only.' });
    }

    const changes = [];
    if (assigned_to !== undefined && assigned_to !== lead.assigned_to) {
      changes.push(`assigned to ${assigned_to || 'unassigned'}`);
      lead.assigned_to = assigned_to;
    }
    if (owner !== undefined && owner !== lead.owner) {
      changes.push(`owner set to ${owner || 'none'}`);
      lead.owner = owner;
    }
    if (changes.length === 0) return res.json(lead);
    await lead.save();

    await Activity.create({
      id: generateId('act'), lead_id: lead.id, type: 'Assignment',
      text: `Lead ${changes.join(' and ')}.`, user_name: req.user.name,
    });

    // Notify the new assignee so the lead surfaces in their queue.
    if (assigned_to && assigned_to !== req.user.name) {
      createNotification({
        user_id: assigned_to,
        title: `Lead assigned to you: ${lead.lead_code || lead.id}`,
        message: `${lead.first_name || 'A lead'} (${lead.destination || 'enquiry'}) was assigned to you by ${req.user.name}.`,
        type: 'info', lead_id: lead.id, entity_type: 'lead', entity_id: lead.id, link: `/leads/${lead.id}`,
      }).catch(() => {});
    }

    auditLog(null, req, 'ASSIGN', 'leads', lead.id, changes.join('; '));
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Stage 4 — Qualify / Unqualify with SLA-based follow-up
// ============================================================================
router.post('/:id/qualify', requireRole(1), async (req, res) => {
  const { decision, reason, sla_hours = 24 } = req.body; // 'Qualified' | 'Unqualified' | 'Pending'

  try {
    const lead = await Lead.findOne({ id: req.params.id });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Recompute score using engagement count
    const touchpoints = await Activity.countDocuments({ lead_id: lead.id });
    const newScore = scoreLead(lead.toObject(), { touchpoints });

    lead.qualification_status = decision;
    lead.qualification_reason = reason;
    lead.lead_score = newScore;
    lead.rating = ratingForScore(newScore);

    // An existing opportunity (if any) is surfaced for the UI, but qualification
    // no longer auto-creates one — conversion is an explicit action.
    let opportunity = null;

    if (decision === 'Unqualified') {
      // §3.3 — Unqualified is the terminal "dead" status; a reason is required.
      lead.status = 'Unqualified';
      lead.pipeline_stage = 'Lost';
    } else if (decision === 'Qualified') {
      lead.status = 'Qualified';
      lead.pipeline_stage = lead.pipeline_stage === 'Lost' ? 'Inquiry' : lead.pipeline_stage;
      // Auto-create follow-up task respecting SLA
      const due = new Date(Date.now() + sla_hours * 3600 * 1000);
      await FollowUp.create({
        id: generateId('fu'),
        lead_id: lead.id,
        date: due.toISOString(),
        method: 'Phone',
        notes: `Auto-created on qualification (SLA ${sla_hours}h)`,
        created_by: req.user.name
      });

      opportunity = await Opportunity.findOne({ lead_id: lead.id });
    }
    await lead.save();

    await Activity.create({
      id: generateId('act'),
      lead_id: lead.id,
      type: 'Qualification',
      text: `Marked ${decision}${reason ? ' — ' + reason : ''}. Score: ${newScore}`,
      user_name: req.user.name
    });

    auditLog(null, req, 'QUALIFY', 'leads', lead.id, `${decision} (score ${newScore})`);
    res.json({ lead, score: newScore, opportunity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Stage 5 — Move card on Kanban pipeline
// ============================================================================
router.post('/:id/pipeline', requireRole(1), async (req, res) => {
  const { stage } = req.body;
  const valid = ['Inquiry', 'Quoted', 'Negotiation', 'Won', 'Lost'];
  if (!valid.includes(stage)) return res.status(400).json({ error: 'Invalid pipeline stage' });

  try {
    const lead = await Lead.findOne({ id: req.params.id });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const prev = lead.pipeline_stage;
    lead.pipeline_stage = stage;
    await lead.save();

    await Activity.create({
      id: generateId('act'),
      lead_id: lead.id,
      type: 'Pipeline',
      text: `Pipeline: ${prev} → ${stage}`,
      user_name: req.user.name
    });
    res.json({ lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Stage 8 — Generate secure share link + customer review actions
// ============================================================================
router.post('/:id/share-link', requireRole(1), async (req, res) => {
  try {
    const lead = await Lead.findOne({ id: req.params.id });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const token = crypto.randomBytes(24).toString('hex');
    lead.share_token = token;
    lead.share_token_expires_at = new Date(Date.now() + 14 * 86400 * 1000); // 14d
    lead.customer_approval_status = 'Sent';
    await lead.save();

    const baseUrl = process.env.APP_URL || 'http://localhost:5005';
    const url = `${baseUrl}/share/${token}`;

    await Activity.create({
      id: generateId('act'),
      lead_id: lead.id,
      type: 'Share',
      text: `Share link generated for customer review`,
      user_name: req.user.name
    });

    res.json({ url, token, expires_at: lead.share_token_expires_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public — fetch shared itinerary (no auth)
const publicRouter = express.Router();
publicRouter.get('/share/:token', async (req, res) => {
  try {
    const lead = await Lead.findOne({ share_token: req.params.token }).lean();
    if (!lead) return res.status(404).json({ error: 'Invalid link' });
    if (lead.share_token_expires_at && new Date(lead.share_token_expires_at) < new Date()) {
      return res.status(410).json({ error: 'Link expired' });
    }
    const billingItems = await BillingItem.find({ lead_id: lead.id }).lean();
    const suppliers = await AssignedSupplier.find({ lead_id: lead.id }).lean();
    res.json({
      lead_code: lead.lead_code,
      customer_name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
      destination: lead.destination,
      travel_start_date: lead.travel_start_date,
      travel_end_date: lead.travel_end_date,
      no_adults: lead.no_adults, no_children: lead.no_children,
      itinerary: lead.enquiry_data,
      items: billingItems,
      suppliers,
      approval_status: lead.customer_approval_status
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

publicRouter.post('/share/:token/respond', async (req, res) => {
  const { action, comment } = req.body; // 'approve' | 'request_changes'
  try {
    const lead = await Lead.findOne({ share_token: req.params.token });
    if (!lead) return res.status(404).json({ error: 'Invalid link' });

    if (action === 'approve') {
      lead.customer_approval_status = 'Approved';
      lead.pipeline_stage = 'Won';
      lead.status = 'Booked';
    } else if (action === 'request_changes') {
      lead.customer_approval_status = 'ChangesRequested';
      lead.customer_change_request = comment;
      lead.revision_cycles = (lead.revision_cycles || 0) + 1;
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
    await lead.save();

    await Activity.create({
      id: generateId('act'),
      lead_id: lead.id,
      type: 'CustomerReview',
      text: action === 'approve'
        ? 'Customer approved itinerary via share link'
        : `Customer requested changes (cycle ${lead.revision_cycles}): ${comment || ''}`,
      user_name: 'Customer'
    });

    res.json({ ok: true, status: lead.customer_approval_status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.publicRoutes = publicRouter;

// ============================================================================
// Stage 12 — Close trip: feedback + loyalty credit + commission release
// ============================================================================
router.post('/:id/close-trip', requireRole(1), async (req, res) => {
  const { rating, comment } = req.body;
  try {
    const lead = await Lead.findOne({ id: req.params.id });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    lead.status = 'Completed';
    lead.trip_completed_at = new Date();
    if (rating !== undefined) lead.customer_feedback_rating = rating;
    if (comment) lead.customer_feedback_comment = comment;
    await lead.save();

    // Loyalty: 1 point per ₹100 paid
    const payments = await Payment.find({ lead_id: lead.id, type: { $ne: 'refunded' } }).lean();
    const paidTotal = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const points = Math.floor(paidTotal / 100);

    const customer = lead.email ? await Customer.findOne({ email: lead.email }) : null;
    if (customer && points > 0) {
      await LoyaltyPoints.create({
        id: generateId('lp'),
        customer_id: customer.id,
        points_earned: points,
        points_redeemed: 0
      });
    }

    await Activity.create({
      id: generateId('act'),
      lead_id: lead.id,
      type: 'TripClosed',
      text: `Trip closed. Feedback: ${rating ?? 'N/A'}/5. Loyalty credited: ${points} pts.`,
      user_name: req.user.name
    });

    auditLog(null, req, 'CLOSE_TRIP', 'leads', lead.id, `Trip closed, ${points} loyalty pts`);
    res.json({ lead, loyalty_points: points });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
