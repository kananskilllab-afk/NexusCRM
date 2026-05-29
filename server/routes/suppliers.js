const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const SupplierRate = require('../models/SupplierRate');
const { authenticate, requireRole, auditLog, generateId } = require('../middleware/auth');

// All routes require auth; level 3 (Ops Manager) required for Suppliers
router.use(authenticate);
router.use(requireRole(2));

// GET /api/suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = await Supplier.find({}).sort({ name: 1 }).lean();
    
    // Normalize and backfill fields from old DB schema (contact_email / primary_contact_phone)
    const normalized = suppliers.map(s => {
      let needsUpdate = false;
      const updateData = {};
      
      if (!s.email && s.contact_email) {
        s.email = s.contact_email;
        updateData.email = s.contact_email;
        needsUpdate = true;
      }
      
      if (!s.phone && s.primary_contact_phone) {
        s.phone = s.primary_contact_phone;
        updateData.phone = s.primary_contact_phone;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        Supplier.updateOne({ _id: s._id }, { $set: updateData }).catch(() => {});
      }
      return s;
    });

    // Attach rates to suppliers
    const suppliersWithRates = await Promise.all(normalized.map(async (supplier) => {
      const rates = await SupplierRate.find({ supplier_id: supplier.id }).lean();
      return { ...supplier, rates };
    }));

    res.json(suppliersWithRates);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// POST /api/suppliers
router.post('/', async (req, res) => {
  const id = generateId('S');
  const { 
    name, product_name, email, phone, service_type, gst, address,
    address_1, address_2, address_3, address_4, city,
    payment_terms, commission_pct, phone_contacts, email_contacts
  } = req.body;

  if (!name || !service_type) return res.status(400).json({ error: 'Name and service type required' });

  if (phone_contacts && phone_contacts.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 phone numbers allowed' });
  }
  if (email_contacts && email_contacts.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 email IDs allowed' });
  }

  try {
    const newSupplier = await Supplier.create({
      id, name, product_name, email, phone, service_type, gst, address,
      address_1, address_2, address_3, address_4, city,
      payment_terms: payment_terms !== undefined ? String(payment_terms) : undefined,
      commission_pct: commission_pct || 0,
      phone_contacts: phone_contacts || [],
      email_contacts: email_contacts || []
    });

    auditLog(null, req, 'CREATE', 'suppliers', id, `Added supplier: ${name}`);
    res.status(201).json(newSupplier);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// PATCH /api/suppliers/:id
router.patch('/:id', async (req, res) => {
  const supplierId = req.params.id;

  const allowed = [
    'name', 'product_name', 'email', 'phone', 'service_type', 'gst', 'address',
    'address_1', 'address_2', 'address_3', 'address_4', 'city', 'status',
    'payment_terms', 'commission_pct', 'phone_contacts', 'email_contacts'
  ];
  const updates = {};
  allowed.forEach(key => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  if (req.body.phone_contacts && req.body.phone_contacts.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 phone numbers allowed' });
  }
  if (req.body.email_contacts && req.body.email_contacts.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 email IDs allowed' });
  }

  if (Object.keys(updates).length === 0) return res.json({ message: 'No updates provided' });

  try {
    const updated = await Supplier.findOneAndUpdate(
      { id: supplierId },
      { $set: updates },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Supplier not found' });

    auditLog(null, req, 'UPDATE', 'suppliers', supplierId, `Updated supplier details`);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// DELETE /api/suppliers/:id
router.delete('/:id', async (req, res) => {
  const supplierId = req.params.id;

  try {
    await Supplier.deleteOne({ id: supplierId });
    // Also delete supplier rates
    await SupplierRate.deleteMany({ supplier_id: supplierId });
    
    auditLog(null, req, 'DELETE', 'suppliers', supplierId, 'Supplier deleted');
    res.json({ message: 'Supplier deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

// --- Supplier Rates ---

// POST /api/suppliers/:id/rates
router.post('/:id/rates', async (req, res) => {
  const rateId = generateId('R');
  const supplierId = req.params.id;
  const { service, details, rate, currency = 'INR', valid_from, valid_to } = req.body;

  if (!service || rate === undefined) return res.status(400).json({ error: 'Service and rate required' });

  try {
    const newRate = await SupplierRate.create({
      id: rateId, supplier_id: supplierId, service, details, rate, currency, valid_from, valid_to
    });

    auditLog(null, req, 'CREATE', 'supplier_rates', rateId, `Added rate for service: ${service}`);
    res.status(201).json(newRate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add rate' });
  }
});

// DELETE /api/suppliers/:id/rates/:rateId
router.delete('/:id/rates/:rateId', async (req, res) => {
  const rateId = req.params.rateId;
  const supplierId = req.params.id;

  try {
    await SupplierRate.deleteOne({ id: rateId, supplier_id: supplierId });
    auditLog(null, req, 'DELETE', 'supplier_rates', rateId, 'Removed rate');
    res.json({ message: 'Rate deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete rate' });
  }
});

module.exports = router;
