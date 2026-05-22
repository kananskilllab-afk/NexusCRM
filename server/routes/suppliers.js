const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const SupplierRate = require('../models/SupplierRate');
const { authenticate, requireRole, auditLog, generateId } = require('../middleware/auth');

// All routes require auth; level 3 (Ops Manager) required for Suppliers
router.use(authenticate);
router.use(requireRole(3));

// GET /api/suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = await Supplier.find({}).sort({ name: 1 }).lean();
    
    // Attach rates to suppliers
    const suppliersWithRates = await Promise.all(suppliers.map(async (supplier) => {
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
  const { name, email, phone, service_type, gst, address, city } = req.body;

  if (!name || !service_type) return res.status(400).json({ error: 'Name and service type required' });

  try {
    const newSupplier = await Supplier.create({
      id, name, email, phone, service_type, gst, address, city
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

  const allowed = ['name', 'email', 'phone', 'service_type', 'gst', 'address', 'city', 'status'];
  const updates = {};
  allowed.forEach(key => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

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
