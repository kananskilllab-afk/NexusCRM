// §3.8 SLA timers, §6.3 rotting alerts, §3.7 nurturing — the Phase-2
// "intelligence & discipline" engine. A lightweight interval runner executes
// idempotent jobs that raise notifications and apply status automation.
// Everything is deduped (via utils/notify) and configurable via env.
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const Activity = require('../models/Activity');
const { createNotification, notifyManagers } = require('./notify');
const { generateId } = require('../middleware/auth');

const num = (v, d) => (v === undefined || v === '' || isNaN(Number(v)) ? d : Number(v));

const CONFIG = {
  intervalMs: num(process.env.SCHEDULER_INTERVAL_MS, 15 * 60 * 1000), // 15 min
  slaFirstResponseMin: num(process.env.SLA_FIRST_RESPONSE_MIN, 30),
  leadStaleDays: num(process.env.LEAD_STALE_DAYS, 7),
  nurtureCapDays: num(process.env.NURTURE_CAP_DAYS, 45),
};

// §6.3 per-stage rotting limit (days of no update) for open opportunities.
const ROT_LIMIT_DAYS = {
  'Qualification': 14,
  'Itinerary': 10,
  'Quote Sent': 7,
  'Negotiation': 7,
  'Verbal Confirm': 5,
};
const DEFAULT_ROT_DAYS = 10;

const ACTIVE_LEAD_STATUSES = ['New', 'Attempting Contact', 'Working'];
const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const minsAgo = (n) => new Date(Date.now() - n * 60000);

// §6.3 — is an open opportunity rotting? Used by the board to flag stale cards.
function opportunityStaleness(opp) {
  if (opp.status !== 'Open') return { stale: false, stale_days: 0 };
  const limit = ROT_LIMIT_DAYS[opp.stage] || DEFAULT_ROT_DAYS;
  const ageDays = Math.floor((Date.now() - new Date(opp.updated_at).getTime()) / 86400000);
  return { stale: ageDays >= limit, stale_days: ageDays };
}

async function lastActivityAt(leadId) {
  const act = await Activity.findOne({ lead_id: leadId }).sort({ created_at: -1 }).lean();
  return act ? new Date(act.created_at) : null;
}

// §3.8 — New leads with no human follow-up within the first-response SLA.
async function slaFirstResponse() {
  const cutoff = minsAgo(CONFIG.slaFirstResponseMin);
  const leads = await Lead.find({ status: 'New', do_not_contact: { $ne: true }, created_at: { $lte: cutoff } }).lean();
  for (const lead of leads) {
    const human = await Activity.countDocuments({ lead_id: lead.id, type: { $nin: ['System'] } });
    if (human > 0) continue;
    const title = `SLA breach: ${lead.lead_code || lead.id} unanswered`;
    const message = `${lead.first_name || 'Lead'} has had no first response within ${CONFIG.slaFirstResponseMin} min.`;
    const link = `/leads/${lead.id}`;
    if (lead.assigned_to) {
      await createNotification({ user_id: lead.assigned_to, title, message, type: 'sla_breach', lead_id: lead.id, entity_type: 'lead', entity_id: lead.id, link });
    }
    await notifyManagers({ title, message, type: 'sla_breach', lead_id: lead.id, entity_type: 'lead', entity_id: lead.id, link });
  }
}

// §3.8 — follow-up overdue (next_follow_up_date in the past) on active leads.
async function followUpDue() {
  const leads = await Lead.find({
    next_follow_up_date: { $lte: new Date() },
    status: { $in: [...ACTIVE_LEAD_STATUSES, 'Nurturing', 'Qualified'] },
  }).lean();
  for (const lead of leads) {
    if (!lead.assigned_to) continue;
    await createNotification({
      user_id: lead.assigned_to,
      title: `Follow-up due: ${lead.lead_code || lead.id}`,
      message: `Scheduled follow-up for ${lead.first_name || 'lead'} is due.`,
      type: 'followup_due', lead_id: lead.id, entity_type: 'lead', entity_id: lead.id, link: `/leads/${lead.id}`,
    });
  }
}

// §3.8 / §3.7 — stale active leads auto-move to Nurturing and notify the owner.
async function staleLeads() {
  const cutoff = daysAgo(CONFIG.leadStaleDays);
  const leads = await Lead.find({ status: { $in: ACTIVE_LEAD_STATUSES }, created_at: { $lte: cutoff } });
  for (const lead of leads) {
    const last = (await lastActivityAt(lead.id)) || new Date(lead.created_at);
    if (last > cutoff) continue;
    lead.status = 'Nurturing';
    await lead.save();
    await Activity.create({
      id: generateId('act'), lead_id: lead.id, type: 'System',
      text: `Auto-moved to Nurturing — no activity for ${CONFIG.leadStaleDays} days.`, user_name: 'System',
    });
    if (lead.assigned_to) {
      await createNotification({
        user_id: lead.assigned_to,
        title: `Lead moved to Nurturing: ${lead.lead_code || lead.id}`,
        message: `${lead.first_name || 'Lead'} went stale (${CONFIG.leadStaleDays}d) and entered the nurturing cadence.`,
        type: 'lead_stale', lead_id: lead.id, entity_type: 'lead', entity_id: lead.id, link: `/leads/${lead.id}`,
      });
    }
  }
}

// §3.7 — nurturing leads silent beyond the cap auto-close as Unqualified.
async function nurtureCap() {
  const cutoff = daysAgo(CONFIG.nurtureCapDays);
  const leads = await Lead.find({ status: 'Nurturing' });
  for (const lead of leads) {
    const last = (await lastActivityAt(lead.id)) || new Date(lead.created_at);
    if (last > cutoff) continue;
    lead.status = 'Unqualified';
    lead.qualification_status = 'Unqualified';
    lead.qualification_reason = `Nurture cap reached (${CONFIG.nurtureCapDays}d silent)`;
    await lead.save();
    await Activity.create({
      id: generateId('act'), lead_id: lead.id, type: 'System',
      text: `Auto-closed Unqualified — nurturing cap of ${CONFIG.nurtureCapDays} days reached.`, user_name: 'System',
    });
    if (lead.assigned_to) {
      await createNotification({
        user_id: lead.assigned_to,
        title: `Lead auto-closed: ${lead.lead_code || lead.id}`,
        message: `${lead.first_name || 'Lead'} hit the nurturing cap and was closed Unqualified.`,
        type: 'nurture_closed', lead_id: lead.id, entity_type: 'lead', entity_id: lead.id, link: `/leads/${lead.id}`,
      });
    }
  }
}

// §6.3 — open opportunities with no update beyond their stage limit are rotting.
async function rottingOpps() {
  const opps = await Opportunity.find({ status: 'Open' }).lean();
  for (const opp of opps) {
    const limit = ROT_LIMIT_DAYS[opp.stage] || DEFAULT_ROT_DAYS;
    if (new Date(opp.updated_at) > daysAgo(limit)) continue;
    const title = `Opportunity rotting: ${opp.opp_code || opp.id}`;
    const message = `${opp.name || opp.customer_name || 'Deal'} has stalled in "${opp.stage}" for over ${limit} days.`;
    const link = '/opportunities';
    if (opp.owner) {
      await createNotification({ user_id: opp.owner, title, message, type: 'opp_rotting', entity_type: 'opportunity', entity_id: opp.id, link });
    }
    await notifyManagers({ title, message, type: 'opp_rotting', entity_type: 'opportunity', entity_id: opp.id, link });
  }
}

const JOBS = [slaFirstResponse, followUpDue, staleLeads, nurtureCap, rottingOpps];

async function runAllJobs() {
  if (mongoose.connection.readyState !== 1) return;
  for (const job of JOBS) {
    try { await job(); }
    catch (err) { console.error(`[Scheduler] Job ${job.name} failed:`, err.message); }
  }
}

function startScheduler() {
  if (process.env.SCHEDULER_ENABLED === 'false') {
    console.log('⏸️  Automation scheduler disabled (SCHEDULER_ENABLED=false)');
    return;
  }
  console.log(`⏰ Automation scheduler running every ${Math.round(CONFIG.intervalMs / 60000)} min`);
  setTimeout(runAllJobs, 30 * 1000); // first sweep shortly after boot
  setInterval(runAllJobs, CONFIG.intervalMs);
}

module.exports = { startScheduler, runAllJobs, CONFIG, opportunityStaleness, ROT_LIMIT_DAYS };
