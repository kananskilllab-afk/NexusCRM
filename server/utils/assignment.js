// Stage 3 — Round-robin auto-assignment.
// Picks the active agent with the fewest open leads. When enquiry type
// is Visa, only agents whose tags include 'visa' (or role contains Visa)
// are eligible, matching the document's skill-match rule.

const CRMUser = require('../models/CRMUser');
const Lead = require('../models/Lead');

const OPEN_STATUSES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation'];

async function pickAgent({ enquiry_types = [] } = {}) {
  const wantsVisa = enquiry_types.includes('Visa');

  const baseFilter = { status: 'Active' };
  let agents = await CRMUser.find(baseFilter).lean();

  // Exclude Admins, Super Admins and Viewers from round-robin.
  agents = agents.filter(a => !['Super Admin', 'Admin', 'Viewer'].includes(a.role));

  if (wantsVisa) {
    const visaTrained = agents.filter(a =>
      (a.area && /visa/i.test(a.area)) || /visa/i.test(a.role || '')
    );
    if (visaTrained.length > 0) agents = visaTrained;
  }

  if (agents.length === 0) return null;

  // Compute open-lead counts per agent.
  const counts = await Lead.aggregate([
    { $match: { status: { $in: OPEN_STATUSES } } },
    { $group: { _id: '$assigned_to', count: { $sum: 1 } } }
  ]);
  const countMap = Object.fromEntries(counts.map(c => [c._id, c.count]));

  agents.sort((a, b) => (countMap[a.name] || 0) - (countMap[b.name] || 0));
  return agents[0];
}

module.exports = { pickAgent };
