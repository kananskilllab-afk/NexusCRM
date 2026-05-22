const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    user_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    entity_type: { type: String, required: true },   // e.g. 'Booking', 'Contact'
    entity_id:   { type: mongoose.Schema.Types.ObjectId, required: true },
    action: {
      type: String,
      enum: ['create', 'update', 'delete', 'view', 'export'],
      required: true,
    },
    diff: { type: mongoose.Schema.Types.Mixed }, // { before: {}, after: {} }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

auditLogSchema.index({ tenant_id: 1, entity_type: 1, entity_id: 1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
