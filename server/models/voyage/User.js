const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password_hash: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'agent', 'manager', 'viewer'],
      default: 'agent',
    },
    commission_tier: {
      type: String,
      enum: ['junior', 'standard', 'senior', 'director'],
      default: 'standard',
    },
    is_active: { type: Boolean, default: true },
    last_login_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

userSchema.index({ tenant_id: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
