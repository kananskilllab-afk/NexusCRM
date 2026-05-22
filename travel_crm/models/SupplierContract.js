const mongoose = require('mongoose');

const supplierContractSchema = new mongoose.Schema(
  {
    tenant_id:               { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    supplier_id:             { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
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

module.exports = mongoose.model('SupplierContract', supplierContractSchema);
