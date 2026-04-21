const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authenticate, requireRole, auditLog, generateId } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Parse JSON fields helper
function safeJson(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

// GET /api/customers - List customers
router.get('/', requireRole(1), (req, res) => {
  const db = getDb();
  
  // Basic implementation: fetch distinct customers. 
  // In a real scenario with derived customers from leads, this might be a UNION or handled client-side
  // For backend logic, we return the dedicated customers table plus converted leads if needed.
  
  const customers = db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all();
  
  const formattedCustomers = customers.map(c => ({
    ...c,
    tags: safeJson(c.tags, [])
  }));

  res.json(formattedCustomers);
});

// POST /api/customers - Create customer
router.post('/', requireRole(1), (req, res) => {
  const db = getDb();
  const id = generateId('C');
  const { 
    salutation, first_name, last_name, email, mobile, phone,
    city, address, date_of_birth, anniversary, customer_type = 'Individual',
    source, tags = [], notes
  } = req.body;

  if (!first_name) return res.status(400).json({ error: 'First name is required' });

  try {
    db.prepare(`
      INSERT INTO customers (id, salutation, first_name, last_name, email, mobile, phone, city, address, date_of_birth, anniversary, customer_type, source, tags, notes, created_by)
      VALUES (@id, @salutation, @first_name, @last_name, @email, @mobile, @phone, @city, @address, @date_of_birth, @anniversary, @customer_type, @source, @tags, @notes, @created_by)
    `).run({
      id, salutation, first_name, last_name, email, mobile, phone, city, address,
      date_of_birth, anniversary, customer_type, source,
      tags: JSON.stringify(tags), notes, created_by: req.user.name
    });

    auditLog(db, req, 'CREATE', 'customers', id, `Created customer: ${first_name} ${last_name || ''}`);
    
    const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    newCustomer.tags = safeJson(newCustomer.tags, []);
    res.status(201).json(newCustomer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PATCH /api/customers/:id - Update customer
router.patch('/:id', requireRole(1), (req, res) => {
  const db = getDb();
  const customerId = req.params.id;

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const allowed = [
    'salutation', 'first_name', 'last_name', 'email', 'mobile', 'phone',
    'city', 'address', 'date_of_birth', 'anniversary', 'customer_type',
    'source', 'tags', 'notes'
  ];

  const updates = {};
  allowed.forEach(key => {
    if (req.body[key] !== undefined) {
      updates[key] = typeof req.body[key] === 'object' ? JSON.stringify(req.body[key]) : req.body[key];
    }
  });

  if (Object.keys(updates).length === 0) return res.json(customer);

  const setClause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
  
  try {
    db.prepare(`UPDATE customers SET ${setClause} WHERE id = @id`)
      .run({ ...updates, id: customerId });
      
    auditLog(db, req, 'UPDATE', 'customers', customerId, `Updated customer properties`);
    
    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    updated.tags = safeJson(updated.tags, []);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', requireRole(2), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  auditLog(db, req, 'DELETE', 'customers', req.params.id, 'Customer deleted');
  res.json({ message: 'Customer deleted' });
});

module.exports = router;
