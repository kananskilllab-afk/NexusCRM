const mongoose = require('mongoose');

const pipelineStageSchema = new mongoose.Schema(
  {
    tenant_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name:             { type: String, required: true, trim: true },
    position:         { type: Number, required: true },
    automation_rules: { type: mongoose.Schema.Types.Mixed, default: {} },
    is_closed_won:    { type: Boolean, default: false },
  },
  { timestamps: false }
);

pipelineStageSchema.index({ tenant_id: 1, position: 1 });

module.exports = mongoose.model('PipelineStage', pipelineStageSchema);
