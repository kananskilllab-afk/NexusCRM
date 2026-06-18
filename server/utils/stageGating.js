// §5.4 / §8 — stage gating. Each pipeline stage has an exit criterion: the key
// field(s) that must be present before an opportunity may advance INTO it.
// The CRM blocks the move if the criterion is unmet (managers may override).
//
// Mapped from the §5.1 "Advance when" column:
//   Qualification  → requirements confirmed (destination + travellers)
//   Itinerary      → a draft itinerary with costs exists (≥1 line item)
//   Quote Sent     → a priced quote exists (Amount > 0)
//   Negotiation    → customer engaging (expected close date set)
//   Verbal Confirm → customer approved (expected close date set)
//   Closed-Won     → booking actioned (≥1 line item and Amount > 0)
//   Closed-Lost    → loss reason (enforced separately in the route)

const GATES = {
  'Itinerary': {
    guidance: 'Confirm requirements: set a destination and traveller count before designing the trip.',
    check: (o) => !!(o.destination && (o.travellers || 0) > 0),
    field: 'destination / travellers',
  },
  'Quote Sent': {
    guidance: 'Build the trip: add at least one package/service line item before sending a quote.',
    check: (o) => Array.isArray(o.line_items) && o.line_items.length > 0,
    field: 'line items',
  },
  'Negotiation': {
    guidance: 'Price the deal: set an Amount before moving to negotiation.',
    check: (o) => (o.estimated_value || 0) > 0,
    field: 'amount',
  },
  'Verbal Confirm': {
    guidance: 'Set an expected close date once the customer agrees to proceed.',
    check: (o) => !!o.expected_close_date,
    field: 'expected close date',
  },
  'Closed-Won': {
    guidance: 'Confirm the booking: the deal needs line items and a non-zero Amount to close won.',
    check: (o) => Array.isArray(o.line_items) && o.line_items.length > 0 && (o.estimated_value || 0) > 0,
    field: 'line items + amount',
  },
};

// Returns { ok: true } or { ok: false, message } for advancing `opp` into `targetStage`.
function checkStageGate(opp, targetStage) {
  const gate = GATES[targetStage];
  if (!gate) return { ok: true };
  if (gate.check(opp)) return { ok: true };
  return { ok: false, message: `Cannot advance to "${targetStage}": ${gate.guidance}` };
}

// Guidance text per stage, surfaced on the board so agents know the exit criterion.
function stageGuidance() {
  const out = {};
  Object.keys(GATES).forEach((s) => { out[s] = GATES[s].guidance; });
  return out;
}

module.exports = { checkStageGate, stageGuidance, GATES };
