const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const SupplierRate = require('../models/SupplierRate');
const { authenticate, requireRole, auditLog, generateId } = require('../middleware/auth');

// All routes require auth; level 3 (Ops Manager) required for suppliers.
router.use(authenticate);
router.use(requireRole(3));

const preferredValue = (value) => (
  value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0
);

const validateContacts = (phoneContacts, emailContacts, res) => {
  if (Array.isArray(phoneContacts) && phoneContacts.length > 10) {
    res.status(400).json({ error: 'Maximum 10 phone numbers allowed' });
    return false;
  }
  if (Array.isArray(emailContacts) && emailContacts.length > 10) {
    res.status(400).json({ error: 'Maximum 10 email IDs allowed' });
    return false;
  }
  return true;
};

// GET /api/suppliers?type=
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const filter = {};
    if (type && type !== 'All') filter.service_type = type;

    const suppliers = await Supplier.find(filter).sort({ is_preferred: -1, name: 1 }).lean();

    const normalized = await Promise.all(suppliers.map(async (supplier) => {
      const updateData = {};

      if (!supplier.email && supplier.contact_email) {
        supplier.email = supplier.contact_email;
        updateData.email = supplier.contact_email;
      }

      if (!supplier.phone && supplier.primary_contact_phone) {
        supplier.phone = supplier.primary_contact_phone;
        updateData.phone = supplier.primary_contact_phone;
      }

      if (Object.keys(updateData).length > 0) {
        Supplier.updateOne({ _id: supplier._id }, { $set: updateData }).catch(() => {});
      }

      const rates = await SupplierRate.find({ supplier_id: supplier.id }).lean();
      return { ...supplier, rates };
    }));

    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// POST /api/suppliers
router.post('/', async (req, res) => {
  const id = generateId('S');
  const {
    name,
    product_name,
    type,
    service_type,
    email,
    phone,
    city,
    location,
    gst,
    address,
    address_1,
    address_2,
    address_3,
    address_4,
    payment_terms,
    commission_pct,
    phone_contacts = [],
    email_contacts = [],
    api_source,
    gds_source,
    is_preferred,
    status,
  } = req.body;
  const resolvedType = service_type || type;

  if (!name || !resolvedType) return res.status(400).json({ error: 'Name and type required' });
  if (!validateContacts(phone_contacts, email_contacts, res)) return;

  try {
    const newSupplier = await Supplier.create({
      id,
      name,
      product_name,
      email,
      phone,
      gst,
      address,
      address_1,
      address_2,
      address_3,
      address_4,
      service_type: resolvedType,
      city: city || location || '',
      payment_terms: payment_terms !== undefined ? String(payment_terms) : undefined,
      commission_pct: parseFloat(commission_pct) || 0,
      phone_contacts,
      email_contacts,
      api_source: api_source || gds_source || '',
      is_preferred: preferredValue(is_preferred),
      status: status || 'Active',
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
  const { phone_contacts, email_contacts } = req.body;

  if (!validateContacts(phone_contacts, email_contacts, res)) return;

  const allowed = [
    'name', 'product_name', 'email', 'phone', 'service_type', 'gst', 'address',
    'address_1', 'address_2', 'address_3', 'address_4', 'city', 'status',
    'payment_terms', 'commission_pct', 'phone_contacts', 'email_contacts',
    'api_source', 'is_preferred',
  ];
  const updates = {};

  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  if (req.body.type !== undefined && updates.service_type === undefined) updates.service_type = req.body.type;
  if (req.body.location !== undefined && updates.city === undefined) updates.city = req.body.location;
  if (req.body.gds_source !== undefined && updates.api_source === undefined) updates.api_source = req.body.gds_source;
  if (updates.commission_pct !== undefined) updates.commission_pct = parseFloat(updates.commission_pct) || 0;
  if (updates.payment_terms !== undefined) updates.payment_terms = String(updates.payment_terms);
  if (updates.is_preferred !== undefined) updates.is_preferred = preferredValue(updates.is_preferred);

  if (Object.keys(updates).length === 0) return res.json({ message: 'No updates provided' });

  try {
    const updated = await Supplier.findOneAndUpdate(
      { id: supplierId },
      { $set: updates },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Supplier not found' });

    auditLog(null, req, 'UPDATE', 'suppliers', supplierId, 'Updated supplier details');
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
    await SupplierRate.deleteMany({ supplier_id: supplierId });

    auditLog(null, req, 'DELETE', 'suppliers', supplierId, 'Supplier deleted');
    res.json({ message: 'Supplier deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

// POST /api/suppliers/:id/rates
router.post('/:id/rates', async (req, res) => {
  const rateId = generateId('R');
  const supplierId = req.params.id;
  const { service, details, rate, currency = 'INR', valid_from, valid_to } = req.body;

  if (!service || rate === undefined) return res.status(400).json({ error: 'Service and rate required' });

  try {
    const newRate = await SupplierRate.create({
      id: rateId,
      supplier_id: supplierId,
      service,
      details,
      rate,
      currency,
      valid_from,
      valid_to,
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
