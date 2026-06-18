// Shared helpers for the sales pipeline (kanban) — tenant resolution,
// default-stage seeding, status syncing and best-effort activity logging.
const mongoose = require('mongoose');
const { Tenant, PipelineStage, Activity, User } = require('../../models/voyage');

// Default board template used the first time a tenant opens the pipeline.
const DEFAULT_STAGES = [
  { name: 'Enquiry',   position: 1, color: '#00A0E3', probability: 10,  is_closed_won: false, is_closed_lost: false },
  { name: 'Proposal',  position: 2, color: '#E19D19', probability: 40,  is_closed_won: false, is_closed_lost: false },
  { name: 'Negotiation', position: 3, color: '#EF7F1A', probability: 70, is_closed_won: false, is_closed_lost: false },
  { name: 'Confirmed', position: 4, color: '#009846', probability: 100, is_closed_won: true,  is_closed_lost: false },
  { name: 'Lost',      position: 5, color: '#E53935', probability: 0,   is_closed_won: false, is_closed_lost: true  },
];

// Resolve the active tenant, auto-creating one for single-tenant deployments.
async function resolveTenant() {
  let tenant = await Tenant.findOne();
  if (!tenant) {
    tenant = await Tenant.create({
      name: 'Voyage Elite Travel',
      plan: 'enterprise',
      settings: { currency: 'INR', timezone: 'Asia/Kolkata', logo_url: '' },
    });
  }
  return tenant;
}

// Return ordered stages for the tenant, seeding the default board if empty.
async function getOrSeedStages(tenantId) {
  let stages = await PipelineStage.find({ tenant_id: tenantId }).sort({ position: 1 });
  if (stages.length === 0) {
    await PipelineStage.insertMany(DEFAULT_STAGES.map((s) => ({ ...s, tenant_id: tenantId })));
    stages = await PipelineStage.find({ tenant_id: tenantId }).sort({ position: 1 });
  }
  return stages;
}

// Map a pipeline stage to the booking lifecycle status it implies.
function statusForStage(stage) {
  if (!stage) return null;
  if (stage.is_closed_won) return 'confirmed';
  if (stage.is_closed_lost) return 'cancelled';
  return 'enquiry';
}

// Resolve a voyage User id for activity attribution (best effort).
async function resolveUserId(req) {
  const candidate = req.user && req.user.id;
  if (candidate && mongoose.Types.ObjectId.isValid(candidate)) {
    const exists = await User.exists({ _id: candidate });
    if (exists) return candidate;
  }
  const anyUser = await User.findOne().select('_id');
  return anyUser ? anyUser._id : null;
}

// Log a stage transition as an activity note. Never throws — logging must
// not break the move operation.
async function logStageActivity(req, { tenantId, booking, fromStage, toStage }) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return;
    await Activity.create({
      tenant_id: tenantId,
      contact_id: booking.contact_id,
      booking_id: booking._id,
      user_id: userId,
      type: 'note',
      note: `Pipeline: moved from "${fromStage ? fromStage.name : 'Unassigned'}" to "${toStage.name}".`,
    });
  } catch (e) {
    /* non-critical */
  }
}

module.exports = {
  DEFAULT_STAGES,
  resolveTenant,
  getOrSeedStages,
  statusForStage,
  resolveUserId,
  logStageActivity,
};
