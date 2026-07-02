const mongoose = require('mongoose');

const supplierContractSchema = new mongoose.Schema(
  {
    tenant_id:               { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    supplier_id:             { type: mongoose.Schema.Types.ObjectId, ref: 'VoyageSupplier' },
    crm_supplier_id:         { type: String },   // CRM Supplier.id (e.g. SUP-xxx)
    crm_supplier_name:       { type: String },   // denormalised for display
    name:                    { type: String, required: true },
    net_rate_multiplier:     { type: Number, default: 1.0 },
    commission_override_pct: { type: Number },
    markup_floor_pct:        { type: Number },
    valid_from:              { type: Date },
    valid_until:             { type: Date },
    is_active:               { type: Boolean, default: true },
    notes:                   { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

supplierContractSchema.index({ supplier_id: 1, is_active: 1 });
supplierContractSchema.index({ crm_supplier_id: 1 });

module.exports = mongoose.models.SupplierContract || mongoose.model('SupplierContract', supplierContractSchema);
