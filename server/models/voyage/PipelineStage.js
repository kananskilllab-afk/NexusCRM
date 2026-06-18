const mongoose = require('mongoose');

const pipelineStageSchema = new mongoose.Schema(
  {
    tenant_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name:             { type: String, required: true, trim: true },
    position:         { type: Number, required: true },
    // Visual accent shown on the board column header.
    color:            { type: String, default: '#284695' },
    // Weighted-forecast probability for deals sitting in this stage (0-100).
    probability:      { type: Number, default: 50, min: 0, max: 100 },
    // Optional cap on number of bookings allowed in the column (0 = no limit).
    wip_limit:        { type: Number, default: 0, min: 0 },
    automation_rules: { type: mongoose.Schema.Types.Mixed, default: {} },
    is_closed_won:    { type: Boolean, default: false },
    is_closed_lost:   { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

pipelineStageSchema.index({ tenant_id: 1, position: 1 });

module.exports = mongoose.model('PipelineStage', pipelineStageSchema);
