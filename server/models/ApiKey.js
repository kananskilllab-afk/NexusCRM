const mongoose = require('mongoose');

const ApiKeySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    user_id: { type: String },
    key_hash: { type: String, required: true, unique: true },
    name: { type: String },
    rate_limit: { type: Number, default: 100 }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.model('ApiKey', ApiKeySchema);
