// §3.4 — lead assignment engine. Rules are applied in order:
//   1. Skill-based pool (e.g. Visa → visa-trained agents)
//   2. Territory / region match (optional)
//   3. Language match (optional)
//   4. Capacity caps (skip agents at their max open-lead ceiling)
//   5. Round-robin within the eligible pool (least open leads wins)

const CRMUser = require('../models/CRMUser');
const Lead = require('../models/Lead');

// Active lead statuses that count toward an agent's open-lead load.
const OPEN_STATUSES = ['New', 'Attempting Contact', 'Working', 'Nurturing', 'Qualified'];

async function pickAgent({ enquiry_types = [], region, language } = {}) {
  const wantsVisa = enquiry_types.includes('Visa');

  let agents = await CRMUser.find({ status: 'Active' }).lean();
  // Exclude Admins, Super Admins and Viewers from round-robin.
  agents = agents.filter((a) => !['Super Admin', 'Admin', 'Viewer'].includes(a.role));
  if (agents.length === 0) return null;

  // 1. Skill pool — visa leads go to visa-trained agents when any exist.
  if (wantsVisa) {
    const visaTrained = agents.filter((a) => (a.area && /visa/i.test(a.area)) || /visa/i.test(a.role || ''));
    if (visaTrained.length > 0) agents = visaTrained;
  }

  // 2. Territory — prefer agents serving the lead's region (only if some match).
  if (region) {
    const inTerritory = agents.filter((a) => a.territory && a.territory.toLowerCase() === String(region).toLowerCase());
    if (inTerritory.length > 0) agents = inTerritory;
  }

  // 3. Language — prefer agents who speak the lead's language (only if some match).
  if (language) {
    const speakers = agents.filter((a) => (a.languages || []).some((l) => l.toLowerCase() === String(language).toLowerCase()));
    if (speakers.length > 0) agents = speakers;
  }

  // Compute current open-lead counts per agent.
  const counts = await Lead.aggregate([
    { $match: { status: { $in: OPEN_STATUSES } } },
    { $group: { _id: '$assigned_to', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));

  // 4. Capacity caps — drop agents at/over their ceiling (0 = unlimited).
  const withCapacity = agents.filter((a) => !a.max_open_leads || (countMap[a.name] || 0) < a.max_open_leads);
  const pool = withCapacity.length > 0 ? withCapacity : agents; // fall back if everyone is full

  // 5. Round-robin — least-loaded eligible agent.
  pool.sort((a, b) => (countMap[a.name] || 0) - (countMap[b.name] || 0));
  return pool[0];
}

module.exports = { pickAgent, OPEN_STATUSES };
