const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    invoice_number: { type: String, unique: true, sparse: true, index: true },
    lead_id: { type: String, required: true, index: true },
    quote_id: { type: String },
    customer_name: { type: String },
    customer_email: { type: String },
    gstin: { type: String },
    place_of_supply: { type: String },
    items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    subtotal: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    tax_total: { type: Number, default: 0 },
    grand_total: { type: Number, default: 0 },
    deposit_paid: { type: Number, default: 0 },
    balance_due: { type: Number, default: 0 },
    balance_due_date: { type: Date },
    status: {
      type: String,
      enum: ['Draft', 'Issued', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'],
      default: 'Draft'
    },
    issued_at: { type: Date },
    supplier_confirmations: { type: [mongoose.Schema.Types.Mixed], default: [] }, // {supplier, ref, segment}
    created_by: { type: String }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

InvoiceSchema.statics.nextInvoiceNumber = async function () {
  const Counter = require('./Counter');
  const seq = await Counter.bump('invoice_number', 700000);
  const fy = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const startYear = d.getMonth() >= 3 ? y : y - 1; // FY Apr-Mar
    return `${String(startYear).slice(-2)}${String(startYear + 1).slice(-2)}`;
  })();
  return `INV-${fy}-${seq}`;
};

module.exports = mongoose.model('Invoice', InvoiceSchema);
