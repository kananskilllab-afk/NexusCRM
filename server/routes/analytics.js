const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const Activity = require('../models/Activity');
const { authenticateToken } = require('../middleware/auth');
const { opportunityStaleness } = require('../utils/scheduler');
const { salesVelocity, forecastBuckets } = require('../utils/forecasting');

const tally = (arr, key) => arr.reduce((acc, x) => {
  const k = (typeof key === 'function' ? key(x) : x[key]) || 'Unknown';
  acc[k] = (acc[k] || 0) + 1; return acc;
}, {});

// GET /api/analytics/revenue
router.get('/revenue', authenticateToken, async (req, res) => {
  const { from, to } = req.query;
  
  try {
    const match = { type: 'received' };
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = from;
      if (to) match.date.$lte = to;
    }

    const data = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $substr: ['$date', 0, 7] },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Map `_id` to `month` for frontend compatibility
    const formatted = data.map(item => ({
      month: item._id,
      revenue: item.revenue
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
});

// GET /api/analytics/top-customers
router.get('/top-customers', authenticateToken, async (req, res) => {
  const limit = req.query.limit || 5;
  
  try {
    const data = await Payment.aggregate([
      { $match: { type: 'received' } },
      {
        $lookup: {
          from: 'leads',
          localField: 'lead_id',
          foreignField: 'id',
          as: 'lead'
        }
      },
      { $unwind: '$lead' },
      {
        $group: {
          _id: '$lead.email',
          total_spent: { $sum: '$amount' }
        }
      },
      { $sort: { total_spent: -1 } },
      { $limit: Number(limit) }
    ]);

    // Map `_id` to `customer` for frontend compatibility
    const formatted = data.map(item => ({
      customer: item._id,
      total_spent: item.total_spent
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch top customers' });
  }
});

// GET /api/analytics/status-distribution
router.get('/status-distribution', authenticateToken, async (req, res) => {
  try {
    const data = await Lead.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Map `_id` to `status` for frontend compatibility
    const formatted = data.map(item => ({
      status: item._id,
      count: item.count
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch status distribution' });
  }
});

// ─── §10.1 Lead funnel ───────────────────────────────────────────────────────
router.get('/lead-funnel', authenticateToken, async (req, res) => {
  try {
    const leads = await Lead.find({}, 'status rating lead_source qualification_status opportunity_id created_at').lean();
    const total = leads.length;
    const qualified = leads.filter((l) => l.qualification_status === 'Qualified' || ['Qualified', 'Converted'].includes(l.status)).length;
    const converted = leads.filter((l) => l.status === 'Converted' || l.opportunity_id).length;

    // Average first-response time: minutes from lead creation to first human activity.
    const firsts = await Activity.aggregate([
      { $match: { type: { $nin: ['System'] } } },
      { $group: { _id: '$lead_id', first: { $min: '$created_at' } } },
    ]);
    const firstMap = Object.fromEntries(firsts.map((f) => [f._id, f.first]));
    let respSum = 0, respCount = 0;
    leads.forEach((l) => {
      const f = firstMap[l.id];
      if (f && l.created_at) {
        const mins = (new Date(f).getTime() - new Date(l.created_at).getTime()) / 60000;
        if (mins >= 0) { respSum += mins; respCount += 1; }
      }
    });

    res.json({
      total,
      by_source: tally(leads, 'lead_source'),
      by_status: tally(leads, 'status'),
      by_rating: tally(leads, (l) => l.rating || 'Cold'),
      qualified,
      qualification_rate: total ? Math.round((qualified / total) * 100) : 0,
      converted,
      conversion_rate: total ? Math.round((converted / total) * 100) : 0,
      contact_rate: total ? Math.round((respCount / total) * 100) : 0,
      avg_first_response_mins: respCount ? Math.round(respSum / respCount) : null,
    });
  } catch (err) {
    console.error('lead-funnel error:', err);
    res.status(500).json({ error: 'Failed to build lead funnel' });
  }
});

// ─── §10.2 Pipeline & opportunities ──────────────────────────────────────────
router.get('/pipeline', authenticateToken, async (req, res) => {
  try {
    const opps = await Opportunity.find({}).lean();
    const STAGE_PROB = Opportunity.STAGE_PROBABILITY;
    const perStage = {};
    Opportunity.STAGES.forEach((s) => { perStage[s] = { stage: s, count: 0, value: 0 }; });

    let openCount = 0, openValue = 0, weighted = 0, wonCount = 0, wonValue = 0, lostCount = 0, staleCount = 0;
    let cycleSum = 0, cycleCount = 0;
    const lossReasons = {};

    opps.forEach((o) => {
      const v = o.estimated_value || 0;
      (perStage[o.stage] || perStage.Qualification).count += 1;
      (perStage[o.stage] || perStage.Qualification).value += v;
      if (o.status === 'Won') {
        wonCount += 1; wonValue += v;
        if (o.won_at && o.created_at) { cycleSum += (new Date(o.won_at) - new Date(o.created_at)) / 86400000; cycleCount += 1; }
      } else if (o.status === 'Lost') {
        lostCount += 1;
        const r = o.lost_reason || 'Unspecified';
        lossReasons[r] = (lossReasons[r] || 0) + 1;
      } else {
        openCount += 1; openValue += v; weighted += Math.round((v * (o.probability || 0)) / 100);
        if (opportunityStaleness(o).stale) staleCount += 1;
      }
    });

    const closed = wonCount + lostCount;
    res.json({
      open_count: openCount,
      open_value: openValue,
      weighted_forecast: weighted,
      won_count: wonCount,
      won_value: wonValue,
      lost_count: lostCount,
      win_rate: closed ? Math.round((wonCount / closed) * 100) : 0,
      avg_deal: openCount ? Math.round(openValue / openCount) : 0,
      avg_cycle_days: cycleCount ? Math.round(cycleSum / cycleCount) : null,
      stale_count: staleCount,
      by_stage: Opportunity.STAGES.map((s) => ({ ...perStage[s], probability: STAGE_PROB[s] })),
      loss_reasons: lossReasons,
    });
  } catch (err) {
    console.error('pipeline error:', err);
    res.status(500).json({ error: 'Failed to build pipeline analytics' });
  }
});

// ─── §10.3 Per-agent leaderboard ─────────────────────────────────────────────
router.get('/agents', authenticateToken, async (req, res) => {
  try {
    const leads = await Lead.find({}, 'assigned_to status qualification_status opportunity_id').lean();
    const opps = await Opportunity.find({ status: 'Won' }, 'owner estimated_value').lean();

    const agents = {};
    const row = (name) => (agents[name] = agents[name] || { agent: name, leads: 0, qualified: 0, converted: 0, won_count: 0, won_value: 0 });
    leads.forEach((l) => {
      const a = row(l.assigned_to || 'Unassigned');
      a.leads += 1;
      if (l.qualification_status === 'Qualified' || ['Qualified', 'Converted'].includes(l.status)) a.qualified += 1;
      if (l.status === 'Converted' || l.opportunity_id) a.converted += 1;
    });
    opps.forEach((o) => { const a = row(o.owner || 'Unassigned'); a.won_count += 1; a.won_value += o.estimated_value || 0; });

    const list = Object.values(agents)
      .map((a) => ({ ...a, conversion_rate: a.leads ? Math.round((a.converted / a.leads) * 100) : 0 }))
      .sort((x, y) => y.won_value - x.won_value);
    res.json(list);
  } catch (err) {
    console.error('agents error:', err);
    res.status(500).json({ error: 'Failed to build agent leaderboard' });
  }
});

// ─── §6.3 Sales velocity ─────────────────────────────────────────────────────
router.get('/velocity', authenticateToken, async (req, res) => {
  try {
    const opps = await Opportunity.find({}).lean();
    let openCount = 0, openValue = 0, wonCount = 0, lostCount = 0, cycleSum = 0, cycleCount = 0;
    opps.forEach((o) => {
      if (o.status === 'Won') {
        wonCount += 1;
        if (o.won_at && o.created_at) { cycleSum += (new Date(o.won_at) - new Date(o.created_at)) / 86400000; cycleCount += 1; }
      } else if (o.status === 'Lost') { lostCount += 1; }
      else { openCount += 1; openValue += o.estimated_value || 0; }
    });
    const closed = wonCount + lostCount;
    const win_rate = closed ? Math.round((wonCount / closed) * 100) : 0;
    const avg_deal = openCount ? Math.round(openValue / openCount) : 0;
    const cycle_days = cycleCount ? Math.round(cycleSum / cycleCount) : 0;
    res.json({
      velocity_per_day: salesVelocity({ open_count: openCount, avg_deal, win_rate, cycle_days }),
      open_count: openCount, avg_deal, win_rate, cycle_days,
    });
  } catch (err) {
    console.error('velocity error:', err);
    res.status(500).json({ error: 'Failed to compute sales velocity' });
  }
});

// ─── §6.2 Advanced forecast (commit / best case / pipeline / closed) ─────────
router.get('/forecast', authenticateToken, async (req, res) => {
  try {
    const opps = await Opportunity.find({}).lean();
    const buckets = forecastBuckets(opps);
    res.json({
      buckets,
      commit: buckets.Commit.value,
      best_case: buckets.Commit.value + buckets['Best Case'].value,
      pipeline: buckets.Commit.value + buckets['Best Case'].value + buckets.Pipeline.value,
      closed: buckets.Closed.value,
      weighted_total: Object.values(buckets).reduce((s, b) => s + (b.category === 'Omitted' ? 0 : b.weighted), 0),
    });
  } catch (err) {
    console.error('forecast error:', err);
    res.status(500).json({ error: 'Failed to build forecast' });
  }
});

// ─── §5.5 / §10 Loss-reason analytics ────────────────────────────────────────
router.get('/loss-reasons', authenticateToken, async (req, res) => {
  try {
    const lost = await Opportunity.find({ status: 'Lost' }, 'lost_reason competitor estimated_value').lean();
    const by_reason = {}; const by_competitor = {}; let lost_value = 0;
    lost.forEach((o) => {
      const r = o.lost_reason || 'Unspecified';
      by_reason[r] = (by_reason[r] || 0) + 1;
      const c = o.competitor || 'None';
      by_competitor[c] = (by_competitor[c] || 0) + 1;
      lost_value += o.estimated_value || 0;
    });
    res.json({ total_lost: lost.length, lost_value, by_reason, by_competitor });
  } catch (err) {
    console.error('loss-reasons error:', err);
    res.status(500).json({ error: 'Failed to build loss-reason analytics' });
  }
});

module.exports = router;
