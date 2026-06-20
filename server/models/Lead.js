const mongoose = require('mongoose');

// §3.3 — the lead status workflow. The first seven are the lead lifecycle;
// 'Converted' and 'Unqualified' are terminal. The trailing values are legacy
// operational statuses still written by fulfilment/cancel flows.
const LEAD_STATUSES = ['New', 'Attempting Contact', 'Working', 'Nurturing', 'Qualified', 'Unqualified', 'Converted'];
const LEGACY_STATUSES = ['Contacted', 'Proposal', 'Negotiation', 'Booked', 'Cancelled', 'Lost'];
// §3.6 rating bands derived from the lead score.
const RATINGS = ['Hot', 'Warm', 'Cold'];
const BUDGET_RANGES = ['<50k', '50k-1L', '1L-2L', '2L+'];
const CONTACT_CHANNELS = ['Call', 'WhatsApp', 'Email'];

const LeadSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    lead_code: { type: String, unique: true, sparse: true, index: true },
    first_name: { type: String },
    last_name: { type: String },
    email: { type: String, lowercase: true, trim: true },
    mobile: { type: String },
    alternate_phone: { type: String },
    status: { type: String, enum: [...LEAD_STATUSES, ...LEGACY_STATUSES], default: 'New' },
    priority: { type: String, default: 'Normal' },
    rating: { type: String, enum: RATINGS, default: 'Cold' }, // §3.6 Hot/Warm/Cold
    no_adults: { type: Number, default: 1 },
    no_children: { type: Number, default: 0 },
    no_infants: { type: Number, default: 0 },
    destination: { type: String },
    lead_source: { type: String },
    assigned_to: { type: String }, // agent currently working the lead
    owner: { type: String },       // responsible owner — defaults to the creator
    travel_start_date: { type: String },
    travel_end_date: { type: String },
    budget_range: { type: String, enum: BUDGET_RANGES },
    preferred_channel: { type: String, enum: CONTACT_CHANNELS },
    region: { type: String },   // §3.4 territory routing
    language: { type: String }, // §3.4 language routing
    do_not_contact: { type: Boolean, default: false },
    next_follow_up_date: { type: Date },
    enquiry_types: { type: [String], default: [] },
    enquiry_data: { type: mongoose.Schema.Types.Mixed, default: {} },
    notes: { type: String },
    tags: { type: [String], default: [] },
    // Stage 1 — channel attribution
    utm_source:   { type: String },
    utm_medium:   { type: String },
    utm_campaign: { type: String },
    referrer_url: { type: String },
    // Stage 4 — qualification & scoring
    qualification_status: { type: String, enum: ['Pending', 'Qualified', 'Unqualified'], default: 'Pending' },
    qualification_reason: { type: String },
    lead_score:   { type: Number, default: 0, min: 0, max: 100 },
    // Stage 5 — Kanban pipeline
    pipeline_stage: { type: String, enum: ['Inquiry', 'Quoted', 'Negotiation', 'Won', 'Lost'], default: 'Inquiry' },
    // §4 — conversion creates an Account + Opportunity; both are linked back here.
    opportunity_id: { type: String, index: true },
    converted_customer_id: { type: String, index: true },
    converted_at:   { type: Date },
    // Stage 8 — secure customer share link
    share_token: { type: String, unique: true, sparse: true },
    share_token_expires_at: { type: Date },
    customer_approval_status: { type: String, enum: ['NotSent', 'Sent', 'Approved', 'ChangesRequested'], default: 'NotSent' },
    customer_change_request: { type: String },
    revision_cycles: { type: Number, default: 0 },
    // Stage 9 — GST / invoice
    gstin: { type: String },
    place_of_supply: { type: String },
    // Stage 12 — closeout
    trip_completed_at: { type: Date },
    customer_feedback_rating: { type: Number, min: 0, max: 5 },
    customer_feedback_comment: { type: String }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Atomic auto-incrementing Lead Code: LD-100001, LD-100002, ...
LeadSchema.statics.nextLeadCode = async function () {
  const Counter = require('./Counter');
  const seq = await Counter.bump('lead_code', 100000);
  return `LD-${seq}`;
};

// §3.6 — map a 0-100 score to its rating band.
LeadSchema.statics.ratingForScore = function (score) {
  const s = Number(score) || 0;
  if (s >= 70) return 'Hot';
  if (s >= 40) return 'Warm';
  return 'Cold';
};

LeadSchema.statics.LEAD_STATUSES = LEAD_STATUSES;
LeadSchema.statics.RATINGS = RATINGS;
LeadSchema.statics.BUDGET_RANGES = BUDGET_RANGES;
LeadSchema.statics.CONTACT_CHANNELS = CONTACT_CHANNELS;

// Pre-Delete Cascade: Delete all associated activities, billing items, payments, follow-ups, and communications when a lead is deleted
LeadSchema.pre('deleteOne', { document: false, query: true }, async function () {
  try {
    const filter = this.getFilter();
    const lead = await this.model.findOne(filter);
    if (!lead) return;

    const Activity = require('./Activity');
    const BillingItem = require('./BillingItem');
    const Payment = require('./Payment');
    const FollowUp = require('./FollowUp');
    const Communication = require('./Communication');
    const Opportunity = require('./Opportunity');

    await Activity.deleteMany({ lead_id: lead.id });
    await BillingItem.deleteMany({ lead_id: lead.id });
    await Payment.deleteMany({ lead_id: lead.id });
    await FollowUp.deleteMany({ lead_id: lead.id });
    await Communication.deleteMany({ lead_id: lead.id });
    await Opportunity.deleteMany({ lead_id: lead.id });

    console.log(`🧹 Cascading delete completed for Lead ID: ${lead.id}`);
  } catch (err) {
    console.error('❌ Error in Lead cascading delete pre-hook:', err);
  }
});

LeadSchema.pre('deleteMany', { document: false, query: true }, async function () {
  try {
    const filter = this.getFilter();
    const leads = await this.model.find(filter);
    if (!leads || leads.length === 0) return;

    const Activity = require('./Activity');
    const BillingItem = require('./BillingItem');
    const Payment = require('./Payment');
    const FollowUp = require('./FollowUp');
    const Communication = require('./Communication');
    const Opportunity = require('./Opportunity');

    const leadIds = leads.map(l => l.id);

    await Activity.deleteMany({ lead_id: { $in: leadIds } });
    await BillingItem.deleteMany({ lead_id: { $in: leadIds } });
    await Payment.deleteMany({ lead_id: { $in: leadIds } });
    await FollowUp.deleteMany({ lead_id: { $in: leadIds } });
    await Communication.deleteMany({ lead_id: { $in: leadIds } });
    await Opportunity.deleteMany({ lead_id: { $in: leadIds } });

    console.log(`🧹 Cascading delete completed for multiple Lead IDs: ${leadIds.join(', ')}`);
  } catch (err) {
    console.error('❌ Error in Lead cascading deleteMany pre-hook:', err);
  }
});

module.exports = mongoose.model('Lead', LeadSchema);
