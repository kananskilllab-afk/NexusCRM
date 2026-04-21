const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authenticate, requireRole, auditLog, generateId } = require('../middleware/auth');
const { ROLE_HIERARCHY } = require('./auth');

// All lead routes require authentication
router.use(authenticate);

// GET /api/leads - list all leads (filtered by role)
router.get('/', (req, res) => {
  const db = getDb();
  const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
  
  let leads;
  if (userLevel >= 3) {
    // Ops Manager and above see all leads
    leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  } else if (userLevel >= 1) {
    // Ops Staff sees assigned leads only
    leads = db.prepare('SELECT * FROM leads WHERE assigned_to = ? ORDER BY created_at DESC').all(req.user.name);
  } else {
    return res.status(403).json({ error: 'No lead access' });
  }

  // Parse JSON fields
  leads = leads.map(l => ({
    ...l,
    enquiry_types: safeJson(l.enquiry_types, []),
    enquiry_data: safeJson(l.enquiry_data, {}),
    tags: safeJson(l.tags, [])
  }));

  res.json(leads);
});

// GET /api/leads/:id - single lead with full detail
router.get('/:id', (req, res) => {
  const db = getDb();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const activities = db.prepare('SELECT * FROM activities WHERE lead_id = ? ORDER BY created_at DESC').all(req.params.id);
  const followUps = db.prepare('SELECT * FROM follow_ups WHERE lead_id = ? ORDER BY date DESC').all(req.params.id);
  const billingItems = db.prepare('SELECT * FROM billing_items WHERE lead_id = ?').all(req.params.id);
  const payments = db.prepare('SELECT * FROM payments WHERE lead_id = ? ORDER BY date DESC').all(req.params.id);
  const assignedSuppliers = db.prepare('SELECT * FROM assigned_suppliers WHERE lead_id = ?').all(req.params.id);
  const communications = db.prepare('SELECT * FROM communications WHERE lead_id = ? ORDER BY sent_at DESC').all(req.params.id);

  res.json({
    ...lead,
    enquiry_types: safeJson(lead.enquiry_types, []),
    enquiry_data: safeJson(lead.enquiry_data, {}),
    tags: safeJson(lead.tags, []),
    activities,
    followUps,
    billing: { items: billingItems, payments },
    assignedSuppliers,
    communications
  });
});

// POST /api/leads - create lead
router.post('/', requireRole(1), (req, res) => {
  const db = getDb();
  const id = generateId('L');
  const {
    first_name, last_name, email, mobile, status = 'New', priority = 'Normal',
    no_adults = 1, no_children = 0, no_infants = 0, destination, lead_source,
    assigned_to, travel_start_date, travel_end_date,
    enquiry_types = [], enquiry_data = {}, notes, tags = []
  } = req.body;

  db.prepare(`
    INSERT INTO leads (id, first_name, last_name, email, mobile, status, priority, no_adults, no_children, no_infants, destination, lead_source, assigned_to, travel_start_date, travel_end_date, enquiry_types, enquiry_data, notes, tags)
    VALUES (@id, @first_name, @last_name, @email, @mobile, @status, @priority, @no_adults, @no_children, @no_infants, @destination, @lead_source, @assigned_to, @travel_start_date, @travel_end_date, @enquiry_types, @enquiry_data, @notes, @tags)
  `).run({
    id, first_name, last_name, email, mobile, status, priority,
    no_adults, no_children, no_infants, destination, lead_source,
    assigned_to: assigned_to || req.user.name, travel_start_date, travel_end_date,
    enquiry_types: JSON.stringify(enquiry_types),
    enquiry_data: JSON.stringify(enquiry_data),
    notes, tags: JSON.stringify(tags)
  });

  // Auto-create activity
  db.prepare(`INSERT INTO activities (id, lead_id, type, text, user_name) VALUES (?, ?, ?, ?, ?)`)
    .run(generateId('act'), id, 'System', `Lead created by ${req.user.name}`, req.user.name);

  auditLog(db, req, 'CREATE', 'leads', id, `Lead created: ${first_name} ${last_name}`);

  const newLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  res.status(201).json(newLead);
});

// PATCH /api/leads/:id - update lead
router.patch('/:id', requireRole(1), (req, res) => {
  const db = getDb();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const allowed = ['first_name','last_name','email','mobile','status','priority','destination',
    'lead_source','assigned_to','travel_start_date','travel_end_date','enquiry_types',
    'enquiry_data','no_adults','no_children','no_infants','notes','tags'];

  const updates = {};
  allowed.forEach(key => {
    if (req.body[key] !== undefined) {
      updates[key] = typeof req.body[key] === 'object' ? JSON.stringify(req.body[key]) : req.body[key];
    }
  });

  if (Object.keys(updates).length === 0) return res.json(lead);

  const setClause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE leads SET ${setClause}, updated_at = datetime('now') WHERE id = @id`)
    .run({ ...updates, id: req.params.id });

  // If status changed, log it
  if (req.body.status && req.body.status !== lead.status) {
    db.prepare(`INSERT INTO activities (id, lead_id, type, text, user_name) VALUES (?, ?, ?, ?, ?)`)
      .run(generateId('act'), req.params.id, 'Status', `Status changed: ${lead.status} → ${req.body.status}`, req.user.name);
  }

  auditLog(db, req, 'UPDATE', 'leads', req.params.id, `Lead updated`);
  const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/leads/:id
router.delete('/:id', requireRole(4), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  auditLog(db, req, 'DELETE', 'leads', req.params.id, 'Lead deleted');
  res.json({ message: 'Lead deleted' });
});

// POST /api/leads/:id/activities - add activity note
router.post('/:id/activities', (req, res) => {
  const db = getDb();
  const id = generateId('act');
  const { text, type = 'Note' } = req.body;
  db.prepare(`INSERT INTO activities (id, lead_id, type, text, user_name) VALUES (?, ?, ?, ?, ?)`)
    .run(id, req.params.id, type, text, req.user.name);
  res.status(201).json(db.prepare('SELECT * FROM activities WHERE id = ?').get(id));
});

// GET /api/leads/:id/activities
router.get('/:id/activities', (req, res) => {
  const db = getDb();
  const activities = db.prepare('SELECT * FROM activities WHERE lead_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json(activities);
});

// POST /api/leads/:id/payments
router.post('/:id/payments', requireRole(1), (req, res) => {
  const db = getDb();
  const id = generateId('pay');
  const { amount, date, method, reference, note } = req.body;
  db.prepare(`INSERT INTO payments (id, lead_id, amount, date, method, reference, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.params.id, amount, date || new Date().toISOString(), method, reference, note, req.user.name);

  // Auto activity
  db.prepare(`INSERT INTO activities (id, lead_id, type, text, user_name) VALUES (?, ?, ?, ?, ?)`)
    .run(generateId('act'), req.params.id, 'Payment', `Payment of ₹${Number(amount).toLocaleString()} received via ${method}`, req.user.name);

  auditLog(db, req, 'PAYMENT', 'payments', id, `Payment: ₹${amount}`);
  res.status(201).json(db.prepare('SELECT * FROM payments WHERE id = ?').get(id));
});

// GET /api/leads/:id/payments
router.get('/:id/payments', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM payments WHERE lead_id = ? ORDER BY date DESC').all(req.params.id));
});

// POST /api/leads/:id/billing-items
router.post('/:id/billing-items', requireRole(1), (req, res) => {
  const db = getDb();
  const id = generateId('item');
  const { description, qty, price, tax } = req.body;
  db.prepare(`INSERT INTO billing_items (id, lead_id, description, qty, price, tax) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, req.params.id, description, qty || 1, price || 0, tax || 0);
  res.status(201).json(db.prepare('SELECT * FROM billing_items WHERE id = ?').get(id));
});

// GET /api/leads/:id/billing-items
router.get('/:id/billing-items', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM billing_items WHERE lead_id = ?').all(req.params.id));
});

// POST /api/leads/:id/follow-ups
router.post('/:id/follow-ups', requireRole(1), (req, res) => {
  const db = getDb();
  const id = generateId('fu');
  const { date, method, notes, outcome, next_date } = req.body;
  db.prepare(`INSERT INTO follow_ups (id, lead_id, date, method, notes, outcome, next_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.params.id, date, method || 'Phone', notes, outcome, next_date, req.user.name);
  
  db.prepare(`INSERT INTO activities (id, lead_id, type, text, user_name) VALUES (?, ?, ?, ?, ?)`)
    .run(generateId('act'), req.params.id, 'FollowUp', `Follow-up scheduled via ${method}: ${notes || ''}`, req.user.name);
  
  res.status(201).json(db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(id));
});

// GET /api/leads/:id/follow-ups
router.get('/:id/follow-ups', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM follow_ups WHERE lead_id = ? ORDER BY date DESC').all(req.params.id));
});

// POST /api/leads/:id/assign-supplier
router.post('/:id/assign-supplier', requireRole(2), (req, res) => {
  const db = getDb();
  const id = generateId('as');
  const { supplier_name, service_type, rate, markup, currency, supplier_id } = req.body;
  db.prepare(`INSERT INTO assigned_suppliers (id, lead_id, supplier_id, supplier_name, service_type, rate, markup, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.params.id, supplier_id, supplier_name, service_type, rate, markup || 0, currency || 'INR');
  
  db.prepare(`INSERT INTO activities (id, lead_id, type, text, user_name) VALUES (?, ?, ?, ?, ?)`)
    .run(generateId('act'), req.params.id, 'Supplier', `Supplier assigned: ${supplier_name} for ${service_type} @ ₹${rate}`, req.user.name);
  
  res.status(201).json(db.prepare('SELECT * FROM assigned_suppliers WHERE id = ?').get(id));
});

// POST /api/leads/:id/communications
router.post('/:id/communications', requireRole(1), (req, res) => {
  const db = getDb();
  const id = generateId('comm');
  const { channel, content, template_name, direction } = req.body;
  db.prepare(`INSERT INTO communications (id, lead_id, channel, direction, template_name, content, sent_by) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.params.id, channel, direction || 'outbound', template_name, content, req.user.name);
  
  db.prepare(`INSERT INTO activities (id, lead_id, type, text, user_name) VALUES (?, ?, ?, ?, ?)`)
    .run(generateId('act'), req.params.id, 'Communication', `${channel} sent: ${template_name || 'Custom message'}`, req.user.name);
  
  res.status(201).json(db.prepare('SELECT * FROM communications WHERE id = ?').get(id));
});

// GET /api/leads/:id/communications
router.get('/:id/communications', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM communications WHERE lead_id = ? ORDER BY sent_at DESC').all(req.params.id));
});

function safeJson(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

module.exports = router;
