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
    mobile: { type: String },
    assigned_to: { type: String }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('CRMUser', CRMUserSchema);
