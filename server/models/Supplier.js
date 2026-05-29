const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    product_name: { type: String },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String },
    service_type: { type: String },
    gst: { type: String },
    address: { type: String },
    address_1: { type: String },
    address_2: { type: String },
    address_3: { type: String },
    address_4: { type: String },
    city: { type: String },
    status: { type: String, default: 'Active' },
    rating: { type: Number, default: 0 },
    is_preferred: { type: Number, default: 0 },
    commission_pct: { type: Number, default: 0 },
    api_source: { type: String },
    gds_id: { type: String },
    payment_terms: { type: String },
    phone_contacts: [
      {
        phone: { type: String },
        name: { type: String },
        designation: { type: String }
      }
    ],
    email_contacts: [
      {
        email: { type: String, lowercase: true, trim: true },
        name: { type: String },
        designation: { type: String }
      }
    ]
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.models.Supplier || mongoose.model('Supplier', SupplierSchema);
