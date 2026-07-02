const mongoose = require('mongoose');

const CRMUserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: 'Viewer' },
    status: { type: String, default: 'Active' },
    area: { type: String },
    // §3.4 routing attributes
    territory: { type: String },           // branch / region this agent serves
    languages: { type: [String], default: [] }, // spoken languages, e.g. ['Gujarati','English']
    max_open_leads: { type: Number, default: 0 }, // 0 = no capacity cap
    mobile: { type: String },
    assigned_to: { type: String },
    smtp_host: { type: String },
    smtp_port: { type: Number },
    smtp_user: { type: String },
    smtp_pass: { type: String },
    email_signature: { type: String },
    profile_image: { type: String },
    signature_fields: {
      name: { type: String },
      title: { type: String },
      company: { type: String },
      website: { type: String },
      phone: { type: String },
      logo: { type: String },
      linkedin: { type: String }
    },
    access_control: { type: [String], default: ['Billing', 'Invoice', 'Voucher', 'Supplier', 'All Contact', 'Reports'] },
    allow_reports: { type: [String], default: ['Lead Wise', 'Lead Created Wise', 'Purchase Report', 'Supplier Paid Report', 'Customer Payment Report', 'Sale Report', 'Bill Payment Reminder Report', 'Cancel Refund', 'Birthday and Anniversary Report'] },
    google_tokens: {
      access_token: { type: String },
      refresh_token: { type: String },
      expiry_date: { type: Number },
      token_type: { type: String },
      scope: { type: String },
    }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('CRMUser', CRMUserSchema);
