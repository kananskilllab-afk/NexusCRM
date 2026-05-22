const mongoose = require('mongoose');

const AssignedSupplierSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    lead_id: { type: String, required: true },
    supplier_id: { type: String },
    supplier_name: { type: String, required: true },
    service_type: { type: String, required: true },
    rate: { type: Number, required: true },
    markup: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    status: { type: String, default: 'Pending' },
    paid_amount: { type: Number, default: 0 }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.model('AssignedSupplier', AssignedSupplierSchema);
