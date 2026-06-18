// Unit tests for the pure Lead & Opportunity blueprint logic (no DB needed).
// Run: npm test   (uses node --test)
const { test } = require('node:test');
const assert = require('node:assert');

const { scoreLead, ratingForScore, scoreBreakdown } = require('../utils/leadScoring');
const { checkStageGate } = require('../utils/stageGating');
const { winLikelihood, salesVelocity, forecastBuckets } = require('../utils/forecasting');
const { opportunityStaleness } = require('../utils/scheduler');
const Opportunity = require('../models/Opportunity');
const whatsapp = require('../utils/integrations/whatsapp');
const payments = require('../utils/integrations/payments');
const gds = require('../utils/integrations/gds');

const daysAgo = (n) => new Date(Date.now() - n * 86400000);

// ── Lead scoring (§3.6) ──────────────────────────────────────────────────────
test('scoreLead stays within 0-100', () => {
  const s = scoreLead({ lead_source: 'Referral', budget_range: '2L+', enquiry_types: ['Package'], no_adults: 4, created_at: new Date() }, { touchpoints: 5, connected: true, opened_link: true });
  assert.ok(s >= 0 && s <= 100);
});

test('ratingForScore bands', () => {
  assert.equal(ratingForScore(75), 'Hot');
  assert.equal(ratingForScore(50), 'Warm');
  assert.equal(ratingForScore(20), 'Cold');
});

test('scoreBreakdown halves sum to total', () => {
  const b = scoreBreakdown({ lead_source: 'Website', budget_range: '50k-1L', enquiry_types: ['Flight'], no_adults: 2, created_at: new Date() }, { touchpoints: 2 });
  assert.equal(Math.round(b.fit + b.engagement), b.total);
  assert.equal(b.rating, ratingForScore(b.total));
});

test('referral + high budget outscores cold social + low budget', () => {
  const hi = scoreLead({ lead_source: 'Referral', budget_range: '2L+', enquiry_types: ['Package'], no_adults: 4, created_at: new Date() }, { touchpoints: 3 });
  const lo = scoreLead({ lead_source: 'Instagram', budget_range: '<50k', enquiry_types: ['Flight'], no_adults: 1, created_at: new Date() }, { touchpoints: 0 });
  assert.ok(hi > lo);
});

// ── Stage gating (§5.4) ──────────────────────────────────────────────────────
test('stage gate: Quote Sent requires line items', () => {
  assert.equal(checkStageGate({ line_items: [] }, 'Quote Sent').ok, false);
  assert.equal(checkStageGate({ line_items: [{ name: 'x' }] }, 'Quote Sent').ok, true);
});

test('stage gate: Itinerary needs destination + travellers', () => {
  assert.equal(checkStageGate({ destination: '', travellers: 0 }, 'Itinerary').ok, false);
  assert.equal(checkStageGate({ destination: 'Bali', travellers: 2 }, 'Itinerary').ok, true);
});

test('stage gate: ungated stage always passes', () => {
  assert.equal(checkStageGate({}, 'Qualification').ok, true);
});

test('stage gate: Closed-Won needs items + amount', () => {
  assert.equal(checkStageGate({ line_items: [{ name: 'x' }], estimated_value: 0 }, 'Closed-Won').ok, false);
  assert.equal(checkStageGate({ line_items: [{ name: 'x' }], estimated_value: 5000 }, 'Closed-Won').ok, true);
});

// ── Forecasting (§6) ─────────────────────────────────────────────────────────
test('winLikelihood terminal states', () => {
  assert.equal(winLikelihood({ status: 'Won' }), 100);
  assert.equal(winLikelihood({ status: 'Lost' }), 0);
});

test('winLikelihood: competitor reduces, line items lift, staleness penalises', () => {
  const fresh = new Date();
  assert.equal(winLikelihood({ status: 'Open', probability: 50, competitor: 'OTA', updated_at: fresh }), 43); // 50*0.85
  assert.equal(winLikelihood({ status: 'Open', probability: 50, competitor: 'None', line_items: [{}], updated_at: fresh }), 53);
  assert.equal(winLikelihood({ status: 'Open', probability: 50, updated_at: daysAgo(20) }), 24); // 50 - (20-7)*2
});

test('salesVelocity formula + zero-cycle guard', () => {
  assert.equal(salesVelocity({ open_count: 10, avg_deal: 100000, win_rate: 25, cycle_days: 50 }), 5000);
  assert.equal(salesVelocity({ open_count: 10, avg_deal: 100000, win_rate: 25, cycle_days: 0 }), 0);
});

test('forecastBuckets categorises by forecast_category', () => {
  const b = forecastBuckets([
    { stage: 'Quote Sent', estimated_value: 1000, probability: 50, forecast_category: 'Best Case' },
    { stage: 'Verbal Confirm', estimated_value: 2000, probability: 90, forecast_category: 'Commit' },
    { stage: 'Closed-Won', estimated_value: 3000, probability: 100, forecast_category: 'Closed' },
  ]);
  assert.equal(b['Best Case'].value, 1000);
  assert.equal(b.Commit.value, 2000);
  assert.equal(b.Closed.value, 3000);
});

// ── Opportunity staleness (§6.3) ─────────────────────────────────────────────
test('opportunityStaleness flags only open + beyond stage limit', () => {
  assert.equal(opportunityStaleness({ status: 'Open', stage: 'Quote Sent', updated_at: daysAgo(10) }).stale, true);
  assert.equal(opportunityStaleness({ status: 'Open', stage: 'Quote Sent', updated_at: new Date() }).stale, false);
  assert.equal(opportunityStaleness({ status: 'Won', stage: 'Quote Sent', updated_at: daysAgo(30) }).stale, false);
});

// ── Opportunity model statics ────────────────────────────────────────────────
test('Opportunity stage statics', () => {
  assert.equal(Opportunity.statusForStage('Closed-Won'), 'Won');
  assert.equal(Opportunity.statusForStage('Closed-Lost'), 'Lost');
  assert.equal(Opportunity.statusForStage('Quote Sent'), 'Open');
  assert.equal(Opportunity.STAGE_PROBABILITY['Verbal Confirm'], 90);
  assert.equal(Opportunity.FORECAST_CATEGORY['Closed-Won'], 'Closed');
});

// ── Integration adapters (stub mode) ─────────────────────────────────────────
test('integrations operate in stub mode when unconfigured', async () => {
  assert.equal(whatsapp.isConfigured(), false);
  const w = await whatsapp.sendWhatsApp('919999999999', 'hi');
  assert.equal(w.ok, true); assert.equal(w.stub, true);

  const p = await payments.createPaymentLink({ amount: 1000 });
  assert.equal(p.ok, true); assert.equal(p.stub, true); assert.ok(p.url);
  const pBad = await payments.createPaymentLink({ amount: 0 });
  assert.equal(pBad.ok, false);

  const g = await gds.searchFlights({ from: 'DEL', to: 'BOM' });
  assert.equal(g.ok, true); assert.equal(g.offers.length, 2);
});
