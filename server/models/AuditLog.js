const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    user_name: { type: String },
    action: { type: String, required: true },
    table_name: { type: String },
    record_id: { type: String },
    details: { type: String },
    ip_address: { type: String }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
