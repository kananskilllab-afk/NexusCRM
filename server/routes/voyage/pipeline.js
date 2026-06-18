const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { PipelineStage, Booking } = require('../../models/voyage');
const { resolveTenant, getOrSeedStages } = require('../../utils/voyage/pipeline');

// Shape a stage document for the client.
const formatStage = (s) => ({
  id: s._id.toString(),
  name: s.name,
  position: s.position,
  color: s.color,
  probability: s.probability,
  wip_limit: s.wip_limit,
  is_closed_won: s.is_closed_won,
  is_closed_lost: s.is_closed_lost,
});

// Shape a booking document (with populated contact) for the board.
const formatBooking = (b) => ({
  id: b._id.toString(),
  stage_id: b.stage_id ? b.stage_id.toString() : null,
  destination: b.destination || 'Custom Trip',
  contact_name: b.contact_id ? b.contact_id.full_name : 'Client',
  contact_id: b.contact_id ? b.contact_id._id.toString() : null,
  last_name: b.contact_id ? b.contact_id.full_name : 'Client', // legacy key
  total_sell_cents: b.total_sell_cents || 0,
  total_cost_cents: b.total_cost_cents || 0,
  currency_code: b.currency_code || 'INR',
  status: b.status,
  priority: b.priority || 'medium',
  board_position: b.board_position || 0,
  expected_close_date: b.expected_close_date || null,
  travel_dates: b.travel_dates || null,
  created_at: b.created_at,
});

// ─── GET full board: stages + bookings + per-stage aggregates + metrics ──────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenant = await resolveTenant();
    const stages = await getOrSeedStages(tenant._id);
    const bookings = await Booking.find({ tenant_id: tenant._id })
      .populate('contact_id')
      .sort({ board_position: 1, created_at: 1 })
      .lean();

    const formattedStages = stages.map(formatStage);
    const formattedBookings = bookings.map(formatBooking);

    res.json({
      stages: formattedStages,
      bookings: formattedBookings,
      metrics: buildMetrics(stages, bookings),
    });
  } catch (err) {
    console.error('❌ GET /pipeline error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET aggregate metrics only ──────────────────────────────────────────────
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const tenant = await resolveTenant();
    const stages = await getOrSeedStages(tenant._id);
    const bookings = await Booking.find({ tenant_id: tenant._id }).lean();
    res.json(buildMetrics(stages, bookings));
  } catch (err) {
    console.error('❌ GET /pipeline/metrics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── CREATE a stage ──────────────────────────────────────────────────────────
router.post('/stages', authenticateToken, async (req, res) => {
  try {
    const tenant = await resolveTenant();
    const { name, color, probability, wip_limit, is_closed_won, is_closed_lost } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Stage name is required' });

    const last = await PipelineStage.findOne({ tenant_id: tenant._id }).sort({ position: -1 });
    const stage = await PipelineStage.create({
      tenant_id: tenant._id,
      name: name.trim(),
      position: last ? last.position + 1 : 1,
      color: color || '#284695',
      probability: clampPct(probability, 50),
      wip_limit: Math.max(0, parseInt(wip_limit, 10) || 0),
      is_closed_won: !!is_closed_won,
      is_closed_lost: !!is_closed_lost,
    });
    res.status(201).json(formatStage(stage));
  } catch (err) {
    console.error('❌ POST /pipeline/stages error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── REORDER stages (must precede /stages/:id) ───────────────────────────────
router.patch('/stages/reorder', authenticateToken, async (req, res) => {
  try {
    const { order } = req.body; // array of stage ids in desired order
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' });

    await Promise.all(
      order.map((id, idx) =>
        PipelineStage.findByIdAndUpdate(id, { position: idx + 1 })
      )
    );
    res.json({ message: 'Stages reordered' });
  } catch (err) {
    console.error('❌ PATCH /pipeline/stages/reorder error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE a stage ──────────────────────────────────────────────────────────
router.patch('/stages/:id', authenticateToken, async (req, res) => {
  try {
    const { name, color, probability, wip_limit, is_closed_won, is_closed_lost } = req.body;
    const update = {};
    if (name !== undefined) update.name = String(name).trim();
    if (color !== undefined) update.color = color;
    if (probability !== undefined) update.probability = clampPct(probability, 50);
    if (wip_limit !== undefined) update.wip_limit = Math.max(0, parseInt(wip_limit, 10) || 0);
    if (is_closed_won !== undefined) update.is_closed_won = !!is_closed_won;
    if (is_closed_lost !== undefined) update.is_closed_lost = !!is_closed_lost;

    const stage = await PipelineStage.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!stage) return res.status(404).json({ error: 'Stage not found' });
    res.json(formatStage(stage));
  } catch (err) {
    console.error('❌ PATCH /pipeline/stages/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE a stage (reassign its bookings) ──────────────────────────────────
router.delete('/stages/:id', authenticateToken, async (req, res) => {
  try {
    const tenant = await resolveTenant();
    const stage = await PipelineStage.findOne({ _id: req.params.id, tenant_id: tenant._id });
    if (!stage) return res.status(404).json({ error: 'Stage not found' });

    const remaining = await PipelineStage.countDocuments({ tenant_id: tenant._id });
    if (remaining <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last remaining stage' });
    }

    // Reassign bookings to an explicit target, or the first surviving stage.
    const orphanCount = await Booking.countDocuments({ stage_id: stage._id });
    if (orphanCount > 0) {
      let target = null;
      if (req.body && req.body.reassign_to) {
        target = await PipelineStage.findOne({ _id: req.body.reassign_to, tenant_id: tenant._id });
      }
      if (!target) {
        target = await PipelineStage.findOne({
          tenant_id: tenant._id,
          _id: { $ne: stage._id },
        }).sort({ position: 1 });
      }
      await Booking.updateMany({ stage_id: stage._id }, { stage_id: target._id });
    }

    await stage.deleteOne();

    // Compact remaining positions so the board stays contiguous.
    const rest = await PipelineStage.find({ tenant_id: tenant._id }).sort({ position: 1 });
    await Promise.all(rest.map((s, idx) => PipelineStage.findByIdAndUpdate(s._id, { position: idx + 1 })));

    res.json({ message: 'Stage deleted', reassigned: orphanCount });
  } catch (err) {
    console.error('❌ DELETE /pipeline/stages/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function clampPct(val, fallback) {
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}

// Build pipeline analytics: per-stage rollups + headline forecast numbers.
function buildMetrics(stages, bookings) {
  const byStage = {};
  stages.forEach((s) => {
    byStage[s._id.toString()] = {
      stage_id: s._id.toString(),
      name: s.name,
      count: 0,
      value_cents: 0,
      weighted_cents: 0,
      probability: s.probability,
      is_closed_won: s.is_closed_won,
      is_closed_lost: s.is_closed_lost,
    };
  });

  let openValue = 0;
  let openCount = 0;
  let weightedForecast = 0;
  let wonValue = 0;
  let wonCount = 0;
  let lostCount = 0;

  const stageMap = {};
  stages.forEach((s) => { stageMap[s._id.toString()] = s; });

  bookings.forEach((b) => {
    const sid = b.stage_id ? b.stage_id.toString() : null;
    const stage = sid ? stageMap[sid] : null;
    const value = b.total_sell_cents || 0;
    if (sid && byStage[sid]) {
      byStage[sid].count += 1;
      byStage[sid].value_cents += value;
      byStage[sid].weighted_cents += Math.round((value * (stage ? stage.probability : 0)) / 100);
    }
    if (stage && stage.is_closed_won) {
      wonValue += value;
      wonCount += 1;
    } else if (stage && stage.is_closed_lost) {
      lostCount += 1;
    } else {
      openValue += value;
      openCount += 1;
      weightedForecast += Math.round((value * (stage ? stage.probability : 0)) / 100);
    }
  });

  const closedTotal = wonCount + lostCount;
  const winRate = closedTotal > 0 ? Math.round((wonCount / closedTotal) * 100) : 0;

  return {
    total_deals: bookings.length,
    open_count: openCount,
    open_value_cents: openValue,
    weighted_forecast_cents: weightedForecast,
    won_count: wonCount,
    won_value_cents: wonValue,
    lost_count: lostCount,
    win_rate: winRate,
    avg_deal_cents: openCount > 0 ? Math.round(openValue / openCount) : 0,
    per_stage: Object.values(byStage),
  };
}

module.exports = router;
