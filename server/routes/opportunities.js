const express = require('express');
const router = express.Router();
const Opportunity = require('../models/Opportunity');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Activity = require('../models/Activity');
const { authenticate, requireRole, auditLog, generateId } = require('../middleware/auth');
const { ROLE_HIERARCHY } = require('./auth');
const { checkStageGate, stageGuidance } = require('../utils/stageGating');
const { opportunityStaleness } = require('../utils/scheduler');
const { winLikelihood } = require('../utils/forecasting');

router.use(authenticate);

const STAGES = Opportunity.STAGES;
const STAGE_PROBABILITY = Opportunity.STAGE_PROBABILITY;
const FORECAST_CATEGORY = Opportunity.FORECAST_CATEGORY;
const SEGMENT_TYPES = Opportunity.SEGMENT_TYPES;
const LOSS_REASONS = Opportunity.LOSS_REASONS;
const COMPETITORS = Opportunity.COMPETITORS;
const OPP_TYPES = Opportunity.OPP_TYPES;
const DEFAULT_STAGE = 'Qualification';
const FORECAST_CATEGORIES = ['Pipeline', 'Best Case', 'Commit', 'Closed', 'Omitted'];

// Budget band → a starting Amount estimate, per §4.3 field mapping.
const BUDGET_ESTIMATE = { '<50k': 40000, '50k-1L': 75000, '1L-2L': 150000, '2L+': 250000 };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// §9 — cost & margin are restricted to managers and above (level ≥ 3).
function canSeeCost(req) {
  return (ROLE_HIERARCHY[req.user.role] || 0) >= 3;
}

// Remove restricted money fields from an opportunity for junior agents.
function stripRestricted(opp, req) {
  if (canSeeCost(req)) return opp;
  const { supplier_cost, margin, ...rest } = opp;
  if (Array.isArray(rest.line_items)) {
    rest.line_items = rest.line_items.map(({ unit_cost, ...li }) => li);
  }
  return rest;
}

// Normalise incoming line items into the shape the schema expects.
function sanitizeLineItems(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((li) => li && (li.name || '').trim())
    .map((li) => ({
      package_id: li.package_id || undefined,
      name: String(li.name).trim(),
      service_type: SEGMENT_TYPES.includes(li.service_type) ? li.service_type : 'Package',
      supplier: li.supplier || undefined,
      quantity: Number(li.quantity) || 0,
      unit_cost: Number(li.unit_cost) || 0,
      unit_price: Number(li.unit_price) || 0,
      description: li.description || undefined,
    }));
}

// Parse the optional scalar opportunity fields shared by create endpoints.
function scalarFields(body) {
  const out = {};
  if (OPP_TYPES.includes(body.opp_type)) out.opp_type = body.opp_type;
  if (COMPETITORS.includes(body.competitor)) out.competitor = body.competitor;
  if (body.next_step !== undefined) out.next_step = body.next_step;
  if (body.travellers !== undefined) out.travellers = Number(body.travellers) || 0;
  if (body.travel_start) out.travel_start = new Date(body.travel_start);
  if (body.travel_end) out.travel_end = new Date(body.travel_end);
  if (body.supplier_cost !== undefined) out.supplier_cost = Number(body.supplier_cost) || 0;
  return out;
}

// Denormalise display fields from a Customer document.
function customerFields(customer) {
  return {
    customer_id: customer.id,
    customer_name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Client',
    email: customer.email,
    mobile: customer.mobile || customer.phone,
    source: customer.source,
  };
}

// Build pipeline analytics from a set of opportunities (§6).
function buildMetrics(opps) {
  const perStage = {};
  STAGES.forEach((s) => {
    perStage[s] = { stage: s, count: 0, value: 0, weighted: 0, probability: STAGE_PROBABILITY[s] };
  });
  const forecast = {};
  FORECAST_CATEGORIES.forEach((c) => { forecast[c] = { category: c, count: 0, value: 0 }; });

  let openCount = 0, openValue = 0, weightedForecast = 0;
  let wonCount = 0, wonValue = 0, lostCount = 0;

  opps.forEach((o) => {
    const value = o.estimated_value || 0;
    const bucket = perStage[o.stage] || perStage[DEFAULT_STAGE];
    bucket.count += 1;
    bucket.value += value;
    bucket.weighted += Math.round((value * (o.probability || 0)) / 100);

    const fc = forecast[o.forecast_category] || forecast.Pipeline;
    fc.count += 1;
    fc.value += value;

    if (o.status === 'Won') { wonCount += 1; wonValue += value; }
    else if (o.status === 'Lost') { lostCount += 1; }
    else {
      openCount += 1;
      openValue += value;
      weightedForecast += Math.round((value * (o.probability || 0)) / 100);
    }
  });

  const closed = wonCount + lostCount;
  return {
    total: opps.length,
    open_count: openCount,
    open_value: openValue,
    weighted_forecast: weightedForecast,
    won_count: wonCount,
    won_value: wonValue,
    lost_count: lostCount,
    win_rate: closed > 0 ? Math.round((wonCount / closed) * 100) : 0,
    avg_deal: openCount > 0 ? Math.round(openValue / openCount) : 0,
    per_stage: STAGES.map((s) => perStage[s]),
    forecast: FORECAST_CATEGORIES.map((c) => forecast[c]),
  };
}

// Apply role-based visibility: managers (lvl>=3) see all, agents see their own.
function ownerFilter(req) {
  const level = ROLE_HIERARCHY[req.user.role] || 0;
  if (level >= 3) return {};
  return { owner: req.user.name };
}

// ─── GET list ────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const opps = await Opportunity.find(ownerFilter(req)).sort({ created_at: -1 }).lean();
    res.json(opps.map((o) => stripRestricted(o, req)));
  } catch (err) {
    res.status(500).json({ error: 'Failed to list opportunities' });
  }
});

// ─── GET board (grouped by stage + metrics) ──────────────────────────────────
router.get('/board', async (req, res) => {
  try {
    const opps = await Opportunity.find(ownerFilter(req))
      .sort({ board_position: 1, created_at: 1 })
      .lean();

    const columns = {};
    STAGES.forEach((s) => { columns[s] = []; });
    opps.forEach((o) => {
      const card = { ...stripRestricted(o, req), ...opportunityStaleness(o), win_likelihood: winLikelihood(o) };
      (columns[o.stage] || columns[DEFAULT_STAGE]).push(card);
    });

    const guidance = stageGuidance();
    res.json({
      stages: STAGES.map((s) => ({
        name: s, probability: STAGE_PROBABILITY[s], forecast_category: FORECAST_CATEGORY[s], guidance: guidance[s] || '',
      })),
      columns,
      metrics: buildMetrics(opps),
    });
  } catch (err) {
    console.error('❌ GET /opportunities/board error:', err);
    res.status(500).json({ error: 'Failed to load board' });
  }
});

// ─── GET single ──────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const opp = await Opportunity.findOne({ id: req.params.id }).lean();
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });
    res.json(stripRestricted(opp, req));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch opportunity' });
  }
});

// ─── CREATE (manual) ─────────────────────────────────────────────────────────
router.post('/', requireRole(1), async (req, res) => {
  try {
    const {
      name, customer_id, customer_name, email, mobile, destination, source, lead_id,
      owner, priority, stage = DEFAULT_STAGE, estimated_value = 0,
      expected_close_date, probability, notes, line_items,
    } = req.body;

    const safeStage = STAGES.includes(stage) ? stage : DEFAULT_STAGE;

    // When a customer is supplied, backfill denormalised display fields.
    let denorm = { customer_id, customer_name, email, mobile, source };
    if (customer_id) {
      const customer = await Customer.findOne({ id: customer_id }).lean();
      if (customer) denorm = { ...denorm, ...customerFields(customer) };
    }

    const opp = await Opportunity.create({
      id: generateId('OPP'),
      opp_code: await Opportunity.nextOppCode(),
      name,
      lead_id: lead_id || undefined,
      ...denorm,
      destination,
      ...scalarFields(req.body),
      owner: owner || req.user.name,
      priority: ['Hot', 'Normal', 'Cold'].includes(priority) ? priority : 'Normal',
      stage: safeStage,
      status: Opportunity.statusForStage(safeStage),
      line_items: sanitizeLineItems(line_items),
      estimated_value: Number(estimated_value) || 0,
      probability: probability !== undefined ? probability : STAGE_PROBABILITY[safeStage],
      expected_close_date: expected_close_date ? new Date(expected_close_date) : undefined,
      notes,
      board_position: -Date.now(), // newest sits at top
    });

    auditLog(null, req, 'CREATE', 'opportunities', opp.id, `Opportunity ${opp.opp_code} created`);
    res.status(201).json(stripRestricted(opp.toObject(), req));
  } catch (err) {
    console.error('❌ POST /opportunities error:', err);
    res.status(500).json({ error: 'Failed to create opportunity' });
  }
});

// ─── CONVERT a qualified lead into an opportunity (§4) ───────────────────────
router.post('/from-lead/:leadId', requireRole(1), async (req, res) => {
  try {
    const lead = await Lead.findOne({ id: req.params.leadId });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Idempotent: return the existing opportunity if already converted.
    const existing = await Opportunity.findOne({ lead_id: lead.id });
    if (existing) return res.status(200).json(existing);

    const { opp, account } = await createOpportunityFromLead(lead, req.user.name, req.body || {});

    // §4.5 — the lead becomes read-only with status Converted, linked to its opp.
    lead.opportunity_id = opp.id;
    lead.converted_customer_id = account.id;
    lead.converted_at = new Date();
    lead.status = 'Converted';
    await lead.save();

    await Activity.create({
      id: generateId('act'),
      lead_id: lead.id,
      type: 'Opportunity',
      text: `Converted to opportunity ${opp.opp_code} on account ${account.first_name || ''} (est. ₹${(opp.estimated_value || 0).toLocaleString('en-IN')})`,
      user_name: req.user.name,
    });

    auditLog(null, req, 'CONVERT', 'opportunities', opp.id, `Lead ${lead.lead_code} → ${opp.opp_code}`);
    res.status(201).json(opp);
  } catch (err) {
    console.error('❌ POST /opportunities/from-lead error:', err);
    res.status(500).json({ error: 'Failed to convert lead' });
  }
});

// ─── CONVERSION PREVIEW (§4.6) — matched account + suggested opp fields ──────
router.get('/from-lead/:leadId/preview', requireRole(1), async (req, res) => {
  try {
    const lead = await Lead.findOne({ id: req.params.leadId }).lean();
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const existing = await findMatchingAccount(lead);
    const account = existing
      ? { matched: true, id: existing.id, name: `${existing.first_name || ''} ${existing.last_name || ''}`.trim(), email: existing.email, mobile: existing.mobile || existing.phone }
      : { matched: false, name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(), email: lead.email, mobile: lead.mobile };

    const already = await Opportunity.findOne({ lead_id: lead.id }).lean();
    res.json({
      account,
      suggested: suggestOppFromLead(lead, existing),
      already_converted: !!already,
      opportunity_id: already ? already.id : null,
    });
  } catch (err) {
    console.error('❌ GET /opportunities/from-lead/:leadId/preview error:', err);
    res.status(500).json({ error: 'Failed to build conversion preview' });
  }
});

// ─── CREATE an opportunity for an existing customer ──────────────────────────
router.post('/from-customer/:customerId', requireRole(1), async (req, res) => {
  try {
    const customer = await Customer.findOne({ id: req.params.customerId }).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const {
      name, line_items, priority, stage = DEFAULT_STAGE,
      estimated_value = 0, expected_close_date, notes, lead_id, destination,
    } = req.body;
    const safeStage = STAGES.includes(stage) ? stage : DEFAULT_STAGE;

    const opp = await Opportunity.create({
      id: generateId('OPP'),
      opp_code: await Opportunity.nextOppCode(),
      name,
      lead_id: lead_id || undefined,
      ...customerFields(customer),
      destination,
      ...scalarFields(req.body),
      owner: req.user.name,
      priority: ['Hot', 'Normal', 'Cold'].includes(priority) ? priority : 'Normal',
      stage: safeStage,
      status: Opportunity.statusForStage(safeStage),
      line_items: sanitizeLineItems(line_items),
      estimated_value: Number(estimated_value) || 0,
      probability: STAGE_PROBABILITY[safeStage],
      expected_close_date: expected_close_date ? new Date(expected_close_date) : undefined,
      notes,
      board_position: -Date.now(),
    });

    auditLog(null, req, 'CREATE', 'opportunities', opp.id,
      `Opportunity ${opp.opp_code} created for customer ${opp.customer_name}`);
    res.status(201).json(stripRestricted(opp.toObject(), req));
  } catch (err) {
    console.error('❌ POST /opportunities/from-customer error:', err);
    res.status(500).json({ error: 'Failed to create opportunity' });
  }
});

// ─── GET a customer's opportunities ──────────────────────────────────────────
router.get('/by-customer/:customerId', async (req, res) => {
  try {
    const opps = await Opportunity.find({ customer_id: req.params.customerId })
      .sort({ created_at: -1 })
      .lean();
    res.json(opps.map((o) => stripRestricted(o, req)));
  } catch (err) {
    res.status(500).json({ error: 'Failed to list customer opportunities' });
  }
});

// ─── UPDATE fields ───────────────────────────────────────────────────────────
router.patch('/:id', requireRole(1), async (req, res) => {
  try {
    const opp = await Opportunity.findOne({ id: req.params.id });
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });

    const allowed = ['name', 'customer_id', 'customer_name', 'email', 'mobile', 'destination', 'source',
      'owner', 'priority', 'estimated_value', 'probability', 'expected_close_date', 'notes', 'line_items',
      'opp_type', 'travellers', 'travel_start', 'travel_end', 'competitor', 'next_step', 'supplier_cost'];
    // §9 — junior agents may not edit restricted cost/margin fields.
    const restricted = ['supplier_cost'];
    allowed.forEach((k) => {
      if (req.body[k] === undefined) return;
      if (restricted.includes(k) && !canSeeCost(req)) return;
      if (k === 'estimated_value' || k === 'supplier_cost') opp[k] = Number(req.body[k]) || 0;
      else if (k === 'travellers') opp.travellers = Number(req.body[k]) || 0;
      else if (k === 'expected_close_date') opp.expected_close_date = req.body[k] ? new Date(req.body[k]) : null;
      else if (k === 'travel_start' || k === 'travel_end') opp[k] = req.body[k] ? new Date(req.body[k]) : null;
      else if (k === 'line_items') opp.line_items = sanitizeLineItems(req.body[k]);
      else opp[k] = req.body[k];
    });

    await opp.save();
    auditLog(null, req, 'UPDATE', 'opportunities', opp.id, 'Opportunity updated');
    res.json(stripRestricted(opp.toObject(), req));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update opportunity' });
  }
});

// ─── MOVE stage (handles win/loss; lead is read-only after conversion) ───────
router.patch('/:id/stage', requireRole(1), async (req, res) => {
  const { stage, board_position, lost_reason } = req.body;
  if (!STAGES.includes(stage)) return res.status(400).json({ error: 'Invalid stage' });

  // §5.5 — a loss reason from the fixed picklist is mandatory on Closed-Lost.
  if (stage === 'Closed-Lost' && !LOSS_REASONS.includes(lost_reason)) {
    return res.status(400).json({ error: 'A valid loss reason is required to mark Closed-Lost' });
  }

  try {
    const opp = await Opportunity.findOne({ id: req.params.id });
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });

    // §5.4/§8 — stage gating: block advancing past an unmet exit criterion.
    // Managers (level ≥ 3) may override; moving backwards is always allowed.
    const isManager = (ROLE_HIERARCHY[req.user.role] || 0) >= 3;
    const advancing = STAGES.indexOf(stage) > STAGES.indexOf(opp.stage);
    if (advancing && !(isManager && req.body.override)) {
      const gate = checkStageGate(opp, stage);
      if (!gate.ok) return res.status(422).json({ error: gate.message });
    }

    const prevStage = opp.stage;
    opp.stage = stage;
    opp.status = Opportunity.statusForStage(stage);
    // Snap probability to the new stage's default.
    opp.probability = STAGE_PROBABILITY[stage];
    if (board_position !== undefined) opp.board_position = board_position;

    if (stage === 'Closed-Won') opp.won_at = new Date();
    if (stage === 'Closed-Lost') {
      opp.lost_at = new Date();
      opp.lost_reason = lost_reason;
    }
    await opp.save();

    // The originating lead is read-only post-conversion (§4.5); we only log
    // an activity against it for the audit trail — no field write-back.
    if (opp.lead_id && prevStage !== stage) {
      await Activity.create({
        id: generateId('act'),
        lead_id: opp.lead_id,
        type: 'Pipeline',
        text: `Opportunity ${opp.opp_code}: ${prevStage} → ${stage}`,
        user_name: req.user.name,
      });
    }

    res.json(stripRestricted(opp.toObject(), req));
  } catch (err) {
    console.error('❌ PATCH /opportunities/:id/stage error:', err);
    res.status(500).json({ error: 'Failed to move opportunity' });
  }
});

// ─── DELETE ──────────────────────────────────────────────────────────────────
router.delete('/:id', requireRole(2), async (req, res) => {
  try {
    const opp = await Opportunity.findOne({ id: req.params.id });
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });

    if (opp.lead_id) {
      await Lead.updateOne({ id: opp.lead_id }, { $unset: { opportunity_id: '' } });
    }
    await Opportunity.deleteOne({ id: opp.id });

    auditLog(null, req, 'DELETE', 'opportunities', opp.id, `Opportunity ${opp.opp_code} deleted`);
    res.json({ message: 'Opportunity deleted', id: opp.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete opportunity' });
  }
});

// §4.4 — find an existing Account/Contact by mobile → email → name (no create).
async function findMatchingAccount(lead) {
  let customer = null;
  if (lead.mobile) customer = await Customer.findOne({ mobile: lead.mobile });
  if (!customer && lead.email) customer = await Customer.findOne({ email: lead.email.toLowerCase() });
  if (!customer && (lead.first_name || lead.last_name)) {
    customer = await Customer.findOne({ first_name: lead.first_name, last_name: lead.last_name });
  }
  return customer;
}

// Match an existing Account or create one from the lead.
async function matchOrCreateAccount(lead, ownerName) {
  const existing = await findMatchingAccount(lead);
  if (existing) return existing;

  return Customer.create({
    id: generateId('C'),
    first_name: lead.first_name || 'Guest',
    last_name: lead.last_name,
    email: lead.email,
    mobile: lead.mobile,
    source: lead.lead_source,
    created_by: ownerName,
  });
}

// §4.3 naming convention: "[Account] — [Destination] [Type] — [Mon YYYY]".
function buildOppName(accountName, lead, oppType) {
  const dest = lead.destination || 'Trip';
  const dateStr = lead.travel_start_date || lead.travel_end_date;
  let when = '';
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d)) when = ` — ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  return `${accountName} — ${dest} ${oppType}${when}`.trim();
}

// §4.6 — suggested opportunity defaults for the conversion screen.
function suggestOppFromLead(lead, account) {
  const accountName = account
    ? `${account.first_name || ''} ${account.last_name || ''}`.trim()
    : `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
  const oppType = (lead.enquiry_types || []).find((t) => OPP_TYPES.includes(t)) || 'Package';
  return {
    name: buildOppName(accountName || 'Client', lead, oppType),
    opp_type: oppType,
    estimated_value: BUDGET_ESTIMATE[lead.budget_range] || 0,
    stage: DEFAULT_STAGE,
    expected_close_date: lead.travel_start_date || null,
  };
}

// Shared factory — convert a qualified lead into Account + Opportunity.
// Exported so the lead routes can reuse the exact same logic.
async function createOpportunityFromLead(lead, ownerName, overrides = {}) {
  const stage = STAGES.includes(overrides.stage) ? overrides.stage : DEFAULT_STAGE;

  // §4.2 — match or create the Account (its post-save hook creates the Contact).
  const account = await matchOrCreateAccount(lead, ownerName);

  // Map enquiry type → opportunity Type (override wins).
  const oppType = OPP_TYPES.includes(overrides.opp_type)
    ? overrides.opp_type
    : ((lead.enquiry_types || []).find((t) => OPP_TYPES.includes(t)) || 'Package');
  const accountName = `${account.first_name || ''} ${account.last_name || ''}`.trim() || 'Client';

  // Initial Amount: explicit override, else from the lead's budget band.
  const budgetEstimate = BUDGET_ESTIMATE[lead.budget_range] || 0;
  const amount = Number(overrides.estimated_value) || budgetEstimate || 0;

  const opp = await Opportunity.create({
    id: generateId('OPP'),
    opp_code: await Opportunity.nextOppCode(),
    name: overrides.name || buildOppName(accountName, lead, oppType),
    lead_id: lead.id,
    ...customerFields(account.toObject ? account.toObject() : account),
    destination: lead.destination,
    opp_type: oppType,
    travellers: (lead.no_adults || 0) + (lead.no_children || 0),
    travel_start: lead.travel_start_date ? new Date(lead.travel_start_date) : undefined,
    travel_end: lead.travel_end_date ? new Date(lead.travel_end_date) : undefined,
    owner: lead.assigned_to || ownerName,
    priority: ['Hot', 'Normal', 'Cold'].includes(lead.priority) ? lead.priority : 'Normal',
    stage,
    status: Opportunity.statusForStage(stage),
    estimated_value: amount,
    probability: STAGE_PROBABILITY[stage],
    expected_close_date: overrides.expected_close_date
      ? new Date(overrides.expected_close_date)
      : (lead.travel_start_date ? new Date(lead.travel_start_date) : undefined),
    notes: lead.notes,
    board_position: -Date.now(),
  });

  return { opp, account };
}

router.createOpportunityFromLead = createOpportunityFromLead;
module.exports = router;
