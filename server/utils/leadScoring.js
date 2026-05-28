// Stage 4 — Lead score (0-100). Drivers: source quality, engagement,
// budget fit, recency. Budget/engagement default to mid when unknown.

const SOURCE_WEIGHTS = {
  'Referral': 35,
  'Walk-in': 32,
  'Website': 28,
  'Phone Call': 26,
  'WhatsApp': 24,
  'Email': 22,
  'Google Ad': 20,
  'Facebook Ad': 18,
  'Instagram': 16,
  'Other': 12
};

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function scoreLead(lead = {}, signals = {}) {
  const source = SOURCE_WEIGHTS[lead.lead_source] ?? 14;

  // Engagement: number of touchpoints (activities + follow-ups + comms)
  const engagement = clamp((signals.touchpoints || 0) * 4, 0, 25);

  // Budget fit: 0-25, default 12 if unknown
  let budgetFit = 12;
  const budget = Number(lead.enquiry_data?.budget) || signals.budget;
  if (budget) {
    if (budget >= 200000) budgetFit = 25;
    else if (budget >= 100000) budgetFit = 20;
    else if (budget >= 50000) budgetFit = 15;
    else if (budget >= 20000) budgetFit = 10;
    else budgetFit = 5;
  }

  // Recency: leads created in last 24h get full 15, decays to 0 at 14 days
  let recency = 15;
  if (lead.created_at) {
    const ageDays = (Date.now() - new Date(lead.created_at).getTime()) / 86400000;
    recency = clamp(15 - Math.floor(ageDays), 0, 15);
  }

  return clamp(Math.round(source + engagement + budgetFit + recency), 0, 100);
}

module.exports = { scoreLead };
