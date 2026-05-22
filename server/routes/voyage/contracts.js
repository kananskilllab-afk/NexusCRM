const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { SupplierContract, Supplier } = require('../../../travel_crm/models');

// GET /api/voyage/contracts — list all contracts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const contracts = await SupplierContract.find().populate('supplier_id', 'name type').lean();
    const formatted = contracts.map(c => ({
      id: c._id.toString(),
      supplier: c.supplier_id ? c.supplier_id.name : 'Unknown',
      supplier_type: c.supplier_id ? c.supplier_id.type : '',
      name: c.name,
      net_rate_multiplier: c.net_rate_multiplier,
      commission_override_pct: c.commission_override_pct,
      markup_floor_pct: c.markup_floor_pct,
      valid_from: c.valid_from ? new Date(c.valid_from).toISOString().split('T')[0] : '',
      valid_until: c.valid_until ? new Date(c.valid_until).toISOString().split('T')[0] : '',
      is_active: c.is_active,
      notes: c.notes || ''
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/voyage/contracts/supplier/:supplierId — contracts for a single supplier
router.get('/supplier/:supplierId', authenticateToken, async (req, res) => {
  try {
    const contracts = await SupplierContract.find({ supplier_id: req.params.supplierId }).lean();
    const formatted = contracts.map(c => ({
      id: c._id.toString(),
      name: c.name,
      net_rate_multiplier: c.net_rate_multiplier,
      commission_override_pct: c.commission_override_pct,
      markup_floor_pct: c.markup_floor_pct,
      valid_from: c.valid_from ? new Date(c.valid_from).toISOString().split('T')[0] : '',
      valid_until: c.valid_until ? new Date(c.valid_until).toISOString().split('T')[0] : '',
      is_active: c.is_active,
      notes: c.notes || ''
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/voyage/contracts — create a contract
router.post('/', authenticateToken, async (req, res) => {
  const { supplier_id, name, net_rate_multiplier, commission_override_pct, markup_floor_pct, valid_from, valid_until, notes } = req.body;
  try {
    const supplier = await Supplier.findById(supplier_id);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    const contract = await SupplierContract.create({
      tenant_id: supplier.tenant_id,
      supplier_id,
      name,
      net_rate_multiplier: net_rate_multiplier || 1.0,
      commission_override_pct,
      markup_floor_pct,
      valid_from: valid_from ? new Date(valid_from) : undefined,
      valid_until: valid_until ? new Date(valid_until) : undefined,
      notes
    });
    res.status(201).json({ id: contract._id.toString(), message: 'Contract created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/voyage/contracts/:id — update a contract
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await SupplierContract.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Contract not found' });
    res.json({ message: 'Contract updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/voyage/contracts/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await SupplierContract.findByIdAndDelete(req.params.id);
    res.json({ message: 'Contract deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
