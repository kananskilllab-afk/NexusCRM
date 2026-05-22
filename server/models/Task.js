const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    booking_id: { type: String },
    assigned_to: { type: String },
    title: { type: String, required: true },
    status: { type: String, default: 'Pending' },
    due_date: { type: String }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.model('Task', TaskSchema);
