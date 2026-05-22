const mongoose = require('mongoose');

const SupplierRateSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    supplier_id: { type: String, required: true },
    service: { type: String, required: true },
    details: { type: String },
    rate: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    valid_from: { type: String },
    valid_to: { type: String }
  },
  { timestamps: false }
);

module.exports = mongoose.model('SupplierRate', SupplierRateSchema);
