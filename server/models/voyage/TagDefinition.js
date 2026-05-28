const mongoose = require('mongoose');

const tagDefinitionSchema = new mongoose.Schema(
  {
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name:      { type: String, required: true, trim: true },
    color_hex: { type: String, match: /^#[0-9A-Fa-f]{6}$/, default: '#888888' },
    category:  { type: String, trim: true }, // e.g. 'Interest', 'Lifecycle', 'Source'
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

tagDefinitionSchema.index({ tenant_id: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('TagDefinition', tagDefinitionSchema);
