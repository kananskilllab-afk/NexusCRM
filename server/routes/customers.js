const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const LoyaltyPoints = require('../models/LoyaltyPoints');
const { authenticate, requireRole, auditLog, generateId } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// GET /api/customers - List customers with loyalty points
router.get('/', requireRole(1), async (req, res) => {
  try {
    const customers = await Customer.find({}).sort({ created_at: -1 }).lean();
    
    // Fetch and join loyalty point records
    const loyaltyRecords = await LoyaltyPoints.find({ customer_id: { $in: customers.map(c => c.id) } }).lean();
    const loyaltyMap = {};
    loyaltyRecords.forEach(r => {
      loyaltyMap[r.customer_id] = (r.points_earned || 0) - (r.points_redeemed || 0);
    });

    const customersWithPoints = customers.map(c => ({
      ...c,
      loyalty_points: loyaltyMap[c.id] || 0
    }));

    res.json(customersWithPoints);
  } catch (err) {
    console.error('Failed to list customers:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/customers/:id - Single customer with loyalty points
router.get('/:id', requireRole(1), async (req, res) => {
  try {
    const customer = await Customer.findOne({ id: req.params.id }).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const records = await LoyaltyPoints.find({ customer_id: customer.id }).lean();
    const loyalty_points = records.reduce(
      (sum, r) => sum + (r.points_earned || 0) - (r.points_redeemed || 0), 0
    );

    res.json({ ...customer, loyalty_points });
  } catch (err) {
    console.error('Failed to fetch customer:', err);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// POST /api/customers - Create customer
router.post('/', requireRole(1), async (req, res) => {
  const id = generateId('C');
  const { 
    salutation, first_name, last_name, email, mobile, phone,
    city, address, date_of_birth, anniversary, customer_type = 'Individual',
    source, tags = [], notes
  } = req.body;

  if (!first_name) return res.status(400).json({ error: 'First name is required' });

  try {
    const newCustomer = await Customer.create({
      id, salutation, first_name, last_name, email, mobile, phone, city, address,
      date_of_birth, anniversary, customer_type, source,
      tags, notes, created_by: req.user.name
    });

    auditLog(null, req, 'CREATE', 'customers', id, `Created customer: ${first_name} ${last_name || ''}`);
    res.status(201).json(newCustomer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PATCH /api/customers/:id - Update customer
router.patch('/:id', requireRole(1), async (req, res) => {
  const customerId = req.params.id;

  try {
    const customer = await Customer.findOne({ id: customerId });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const allowed = [
      'salutation', 'first_name', 'last_name', 'email', 'mobile', 'phone',
      'city', 'address', 'date_of_birth', 'anniversary', 'customer_type',
      'source', 'tags', 'notes', 'preferred_currency', 'notification_enabled',
      'two_factor_enabled', 'gdpr_consent_at'
    ];

    const updates = {};
    allowed.forEach(key => {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) return res.json(customer);

    const updated = await Customer.findOneAndUpdate(
      { id: customerId },
      { $set: updates },
      { new: true }
    );
      
    auditLog(null, req, 'UPDATE', 'customers', customerId, `Updated customer properties`);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', requireRole(2), async (req, res) => {
  const customerId = req.params.id;

  try {
    const result = await Customer.deleteOne({ id: customerId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    auditLog(null, req, 'DELETE', 'customers', customerId, 'Customer deleted');
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

module.exports = router;
