const mongoose = require('mongoose');

const SavedFilterSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    user_id: { type: String },
    name: { type: String, required: true },
    filter_config: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.model('SavedFilter', SavedFilterSchema);
