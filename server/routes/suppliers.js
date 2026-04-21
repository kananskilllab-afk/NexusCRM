const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authenticate, requireRole, auditLog, generateId } = require('../middleware/auth');

// All routes require auth; level 3 (Ops Manager) required for Suppliers
router.use(authenticate);
router.use(requireRole(3));

// GET /api/suppliers
router.get('/', (req, res) => {
  const db = getDb();
  const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all();
  
  // Attach rates to suppliers
  const suppliersWithRates = suppliers.map(supplier => {
    const rates = db.prepare('SELECT * FROM supplier_rates WHERE supplier_id = ?').all(supplier.id);
    return { ...supplier, rates };
  });

  res.json(suppliersWithRates);
});

// POST /api/suppliers
router.post('/', (req, res) => {
  const db = getDb();
  const id = generateId('S');
  const { name, email, phone, service_type, gst, address, city } = req.body;

  if (!name || !service_type) return res.status(400).json({ error: 'Name and service type required' });

  try {
    db.prepare(`
      INSERT INTO suppliers (id, name, email, phone, service_type, gst, address, city)
      VALUES (@id, @name, @email, @phone, @service_type, @gst, @address, @city)
    `).run({ id, name, email, phone, service_type, gst, address, city });

    auditLog(db, req, 'CREATE', 'suppliers', id, `Added supplier: ${name}`);
    res.status(201).json(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id));
  } catch (error) {
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// PATCH /api/suppliers/:id
router.patch('/:id', (req, res) => {
  const db = getDb();
  const supplierId = req.params.id;

  const allowed = ['name', 'email', 'phone', 'service_type', 'gst', 'address', 'city', 'status'];
  const updates = {};
  allowed.forEach(key => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  if (Object.keys(updates).length === 0) return res.json({ message: 'No updates provided' });

  const setClause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
  
  try {
    db.prepare(`UPDATE suppliers SET ${setClause} WHERE id = @id`).run({ ...updates, id: supplierId });
    auditLog(db, req, 'UPDATE', 'suppliers', supplierId, `Updated supplier details`);
    res.json(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId));
  } catch(e) {
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// DELETE /api/suppliers/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
  auditLog(db, req, 'DELETE', 'suppliers', req.params.id, 'Supplier deleted');
  res.json({ message: 'Supplier deleted' });
});

// --- Supplier Rates ---

// POST /api/suppliers/:id/rates
router.post('/:id/rates', (req, res) => {
  const db = getDb();
  const rateId = generateId('R');
  const supplierId = req.params.id;
  const { service, details, rate, currency = 'INR', valid_from, valid_to } = req.body;

  if (!service || rate === undefined) return res.status(400).json({ error: 'Service and rate required' });

  try {
    db.prepare(`
      INSERT INTO supplier_rates (id, supplier_id, service, details, rate, currency, valid_from, valid_to)
      VALUES (@id, @supplierId, @service, @details, @rate, @currency, @valid_from, @valid_to)
    `).run({ id: rateId, supplierId, service, details, rate, currency, valid_from, valid_to });

    auditLog(db, req, 'CREATE', 'supplier_rates', rateId, `Added rate for service: ${service}`);
    res.status(201).json(db.prepare('SELECT * FROM supplier_rates WHERE id = ?').get(rateId));
  } catch (error) {
    res.status(500).json({ error: 'Failed to add rate' });
  }
});

// DELETE /api/suppliers/:id/rates/:rateId
router.delete('/:id/rates/:rateId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM supplier_rates WHERE id = ? AND supplier_id = ?').run(req.params.rateId, req.params.id);
  auditLog(db, req, 'DELETE', 'supplier_rates', req.params.rateId, 'Removed rate');
  res.json({ message: 'Rate deleted' });
});

module.exports = router;
