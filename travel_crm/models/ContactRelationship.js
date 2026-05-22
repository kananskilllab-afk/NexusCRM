const mongoose = require('mongoose');

const contactRelationshipSchema = new mongoose.Schema(
  {
    tenant_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    from_contact_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
    to_contact_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
    relationship_type: {
      type: String,
      enum: ['spouse', 'partner', 'family', 'colleague', 'corporate_account', 'companion', 'other'],
      required: true,
    },
    notes: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

contactRelationshipSchema.index({ from_contact_id: 1, to_contact_id: 1 });

module.exports = mongoose.model('ContactRelationship', contactRelationshipSchema);
