const mongoose = require('mongoose');

// Junction collection between Contact and TagDefinition
const contactTagSchema = new mongoose.Schema(
  {
    contact_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
    tag_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'TagDefinition', required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

contactTagSchema.index({ contact_id: 1, tag_id: 1 }, { unique: true });

module.exports = mongoose.model('ContactTag', contactTagSchema);
