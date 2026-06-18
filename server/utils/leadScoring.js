// §3.6 — Lead score (0-100), built from two halves: Fit (who they are, max 50)
// and Engagement (what they do, max 50). Signals that aren't known yet default
// low, so the score rises as real fit/engagement data arrives.

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

// Source quality contribution to Fit (max 15): referral / walk-in high, cold social low.
const SOURCE_FIT = {
  'Referral': 15, 'Walk-in': 14, 'Website': 11, 'Phone Call': 11, 'Phone': 11,
  'WhatsApp': 10, 'Email': 9, 'Google Ad': 8, 'Paid Ad': 8, 'Facebook Ad': 6,
  'Instagram': 6, 'Social': 5, 'Other': 4,
};

// Fit — max 50.
function fitScore(lead) {
  // Source quality (max 15)
  const source = SOURCE_FIT[lead.lead_source] ?? 7;

  // Budget fit (max 15) — from the budget band or a numeric enquiry budget.
  let budget = 7;
  const band = lead.budget_range;
  const num = Number(lead.enquiry_data && lead.enquiry_data.budget) || 0;
  if (band === '2L+' || num >= 200000) budget = 15;
  else if (band === '1L-2L' || num >= 100000) budget = 12;
  else if (band === '50k-1L' || num >= 50000) budget = 9;
  else if (band === '<50k' || num > 0) budget = 5;

  // Trip-value potential (max 10) — international package > domestic flight-only.
  const types = (lead.enquiry_types || []).map((t) => String(t).toLowerCase());
  let tripValue = 4;
  if (types.includes('package')) tripValue = 10;
  else if (types.includes('hotel') || types.includes('visa')) tripValue = 7;
  else if (types.includes('flight')) tripValue = 5;

  // Traveller count / corporate account (max 10).
  const pax = (lead.no_adults || 0) + (lead.no_children || 0);
  let paxScore = 4;
  if (pax >= 4) paxScore = 10;
  else if (pax >= 2) paxScore = 7;

  return clamp(source + budget + tripValue + paxScore, 0, 50);
}

// Engagement — max 50. Rich signals (connected, opened_link, requested_callback,
// revisits) override the touchpoint-based proxy when supplied.
function engagementScore(lead, signals) {
  const t = signals.touchpoints || 0;

  // Connected on a call / replied on WhatsApp (max 15).
  const connected = signals.connected ? 15 : clamp(t * 5, 0, 15);
  // Opened the shared itinerary / quote link (max 10).
  const opened = signals.opened_link ? 10 : 0;
  // Requested a callback / asked for options (max 10).
  const requested = signals.requested_callback ? 10 : 0;
  // Recency (max 10) — full for fresh leads, decays one point per day.
  let recency = 0;
  if (lead.created_at) {
    const ageDays = (Date.now() - new Date(lead.created_at).getTime()) / 86400000;
    recency = clamp(10 - Math.floor(ageDays), 0, 10);
  }
  // Website revisits / multiple enquiries (max 5).
  const revisits = signals.revisits
    ? clamp(signals.revisits, 0, 5)
    : ((lead.enquiry_types || []).length > 1 ? 3 : 0);

  return clamp(connected + opened + requested + recency + revisits, 0, 50);
}

function scoreLead(lead = {}, signals = {}) {
  return clamp(Math.round(fitScore(lead) + engagementScore(lead, signals)), 0, 100);
}

// §3.6 rating bands.
function ratingForScore(score) {
  const s = Number(score) || 0;
  if (s >= 70) return 'Hot';
  if (s >= 40) return 'Warm';
  return 'Cold';
}

// Behavioural breakdown: Fit vs Engagement halves + the total and rating band.
// Useful for explaining a score on the lead detail screen.
function scoreBreakdown(lead = {}, signals = {}) {
  const fit = fitScore(lead);
  const engagement = engagementScore(lead, signals);
  const total = clamp(Math.round(fit + engagement), 0, 100);
  return { fit, engagement, total, rating: ratingForScore(total) };
}

module.exports = { scoreLead, ratingForScore, scoreBreakdown };
