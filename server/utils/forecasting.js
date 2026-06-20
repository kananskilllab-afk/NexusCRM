// Phase 3 — predictive & forecasting helpers. All pure functions so they can be
// unit-tested without a database and reused by the analytics routes + board.

const FORECAST_CATEGORY = {
  'Qualification': 'Pipeline',
  'Itinerary': 'Pipeline',
  'Quote Sent': 'Best Case',
  'Negotiation': 'Best Case',
  'Verbal Confirm': 'Commit',
  'Closed-Won': 'Closed',
  'Closed-Lost': 'Omitted',
};

// Behavioural win-likelihood (0-100) for an open opportunity. Starts from the
// stage probability, then adjusts for competitor pressure, idle/rot, and whether
// the deal has been priced (line items present).
function winLikelihood(opp = {}) {
  if (opp.status === 'Won') return 100;
  if (opp.status === 'Lost') return 0;

  let p = Number(opp.probability) || 0;
  if (opp.competitor && opp.competitor !== 'None') p *= 0.85;

  const idleDays = opp.updated_at ? Math.floor((Date.now() - new Date(opp.updated_at).getTime()) / 86400000) : 0;
  if (idleDays > 7) p -= Math.min(30, (idleDays - 7) * 2);

  if (Array.isArray(opp.line_items) && opp.line_items.length > 0) p += 3;

  return Math.max(0, Math.min(100, Math.round(p)));
}

// §6.3 sales velocity — revenue the pipeline generates per day.
//   velocity = (open deals × avg deal value × win rate) ÷ avg sales-cycle length
function salesVelocity({ open_count = 0, avg_deal = 0, win_rate = 0, cycle_days = 0 } = {}) {
  if (!cycle_days || cycle_days <= 0) return 0;
  return Math.round((open_count * avg_deal * (win_rate / 100)) / cycle_days);
}

// §6.2 forecast buckets: group opportunities into Pipeline / Best Case / Commit /
// Closed / Omitted with their summed Amount + a probability-weighted total.
function forecastBuckets(opps = []) {
  const buckets = {
    Pipeline: { category: 'Pipeline', count: 0, value: 0, weighted: 0 },
    'Best Case': { category: 'Best Case', count: 0, value: 0, weighted: 0 },
    Commit: { category: 'Commit', count: 0, value: 0, weighted: 0 },
    Closed: { category: 'Closed', count: 0, value: 0, weighted: 0 },
    Omitted: { category: 'Omitted', count: 0, value: 0, weighted: 0 },
  };
  opps.forEach((o) => {
    const cat = o.forecast_category || FORECAST_CATEGORY[o.stage] || 'Pipeline';
    const b = buckets[cat] || buckets.Pipeline;
    const v = o.estimated_value || 0;
    b.count += 1;
    b.value += v;
    b.weighted += Math.round((v * (o.probability || 0)) / 100);
  });
  return buckets;
}

module.exports = { winLikelihood, salesVelocity, forecastBuckets, FORECAST_CATEGORY };
