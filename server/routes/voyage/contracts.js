const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { SupplierContract, Supplier: VoyageSupplier } = require('../../models/voyage');
const CRMSupplier = require('../../models/Supplier');

// GET /api/voyage/contracts — list all contracts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const contracts = await SupplierContract.find().lean();

    // Try to populate VoyageSupplier names; fall back to crm_supplier_name field
    const formatted = await Promise.all(contracts.map(async (c) => {
      let supplierName = c.crm_supplier_name || 'Unknown';
      let supplierType = '';

      // Try VoyageSupplier lookup
      if (c.supplier_id) {
        try {
          const vs = await VoyageSupplier.findById(c.supplier_id).lean();
          if (vs) { supplierName = vs.name; supplierType = vs.type || ''; }
        } catch (_) {}
      }

      // Fall back to CRM Supplier if we have a string ref
      if (supplierName === 'Unknown' && c.crm_supplier_id) {
        try {
          const cs = await CRMSupplier.findOne({ id: c.crm_supplier_id }).lean();
          if (cs) { supplierName = cs.name; supplierType = cs.service_type || ''; }
        } catch (_) {}
      }

      return {
        id: c._id.toString(),
        supplier: supplierName,
        supplier_type: supplierType,
        name: c.name,
        net_rate_multiplier: c.net_rate_multiplier,
        commission_override_pct: c.commission_override_pct,
        markup_floor_pct: c.markup_floor_pct,
        valid_from: c.valid_from ? new Date(c.valid_from).toISOString().split('T')[0] : '',
        valid_until: c.valid_until ? new Date(c.valid_until).toISOString().split('T')[0] : '',
        is_active: c.is_active,
        notes: c.notes || ''
      };
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/voyage/contracts/supplier/:supplierId — contracts for a single supplier
router.get('/supplier/:supplierId', authenticateToken, async (req, res) => {
  try {
    const sid = req.params.supplierId;
    // Search by both Voyage ObjectId and CRM string ID
    const contracts = await SupplierContract.find({
      $or: [
        ...(sid.match(/^[0-9a-fA-F]{24}$/) ? [{ supplier_id: sid }] : []),
        { crm_supplier_id: sid }
      ]
    }).lean();
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

  if (!name) return res.status(400).json({ error: 'Contract name is required' });
  if (!supplier_id) return res.status(400).json({ error: 'Supplier is required' });

  try {
    let voyageSupplierId = undefined;
    let tenantId = undefined;
    let crmSupplierId = undefined;
    let crmSupplierName = '';

    // Check if supplier_id is a MongoDB ObjectId (VoyageSupplier)
    if (supplier_id.match(/^[0-9a-fA-F]{24}$/)) {
      const vs = await VoyageSupplier.findById(supplier_id);
      if (vs) {
        voyageSupplierId = vs._id;
        tenantId = vs.tenant_id;
        crmSupplierName = vs.name;
      }
    }

    // If not found as VoyageSupplier, try CRM Supplier by string ID
    if (!voyageSupplierId) {
      const cs = await CRMSupplier.findOne({ id: supplier_id });
      if (!cs) return res.status(404).json({ error: 'Supplier not found' });

      crmSupplierId = cs.id;
      crmSupplierName = cs.name;

      // Auto-create a VoyageSupplier record so the contract schema is satisfied
      const { Tenant } = require('../../models/voyage');
      let tenant = await Tenant.findOne();
      if (!tenant) {
        tenant = await Tenant.create({ company_name: 'Kanan International', base_currency: 'INR' });
      }
      tenantId = tenant._id;

      const newVS = await VoyageSupplier.create({
        tenant_id: tenantId,
        type: mapServiceType(cs.service_type),
        name: cs.name,
        contact_email: cs.email,
        primary_contact_name: cs.name,
        primary_contact_phone: cs.phone,
        commission_pct: cs.commission_pct || 0,
        is_preferred: cs.is_preferred === 1,
      });
      voyageSupplierId = newVS._id;
    }

    const contract = await SupplierContract.create({
      tenant_id: tenantId,
      supplier_id: voyageSupplierId,
      crm_supplier_id: crmSupplierId,
      crm_supplier_name: crmSupplierName,
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
    console.error('❌ Contract creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Map CRM service types to VoyageSupplier enum
function mapServiceType(crmType) {
  const map = {
    'Hotel': 'hotel', 'Airline': 'airline', 'Flight': 'airline',
    'Transfer': 'transfer', 'Tour Operator': 'tour_operator',
    'Cruise': 'cruise_line', 'Car Hire': 'car_hire', 'Insurance': 'insurance',
  };
  return map[crmType] || 'other';
}

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
