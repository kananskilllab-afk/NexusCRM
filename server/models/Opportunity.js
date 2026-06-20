const mongoose = require('mongoose');

// §5.1 of the Lead & Opportunity blueprint: the 7-stage sales pipeline.
// Each stage carries a default win-probability used for weighted forecasting.
// Closed-Won / Closed-Lost are the two terminal stages.
const STAGES = [
  'Qualification',
  'Itinerary',          // "Itinerary / Needs Analysis"
  'Quote Sent',
  'Negotiation',
  'Verbal Confirm',     // "Verbal Confirm / Pending Payment"
  'Closed-Won',
  'Closed-Lost',
];

const STAGE_PROBABILITY = {
  'Qualification': 10,
  'Itinerary': 25,
  'Quote Sent': 50,
  'Negotiation': 75,
  'Verbal Confirm': 90,
  'Closed-Won': 100,
  'Closed-Lost': 0,
};

// §6.2 forecast categories — grouping for the revenue forecast.
const FORECAST_CATEGORY = {
  'Qualification': 'Pipeline',
  'Itinerary': 'Pipeline',
  'Quote Sent': 'Best Case',
  'Negotiation': 'Best Case',
  'Verbal Confirm': 'Commit',
  'Closed-Won': 'Closed',
  'Closed-Lost': 'Omitted',
};

// §5.5 fixed loss-reason picklist, mandatory on Closed-Lost.
const LOSS_REASONS = ['Price', 'Timing', 'Went with competitor', 'Plan cancelled', 'No response', 'Budget'];
const COMPETITORS = ['Other agency', 'OTA', 'DIY', 'None'];
const OPP_TYPES = ['Flight', 'Hotel', 'Visa', 'Package'];

// §5.3 OpportunityLineItem — one per trip segment. Sum of line totals is the
// Opportunity Amount and also feeds the Quote. unit_cost/markup are the
// restricted margin fields (hidden from junior agents at the API layer).
const SEGMENT_TYPES = ['Package', 'Flight', 'Hotel', 'Activity', 'Transfer', 'Tour', 'Visa', 'Insurance', 'Other'];
const LineItemSchema = new mongoose.Schema(
  {
    package_id:   { type: String }, // optional link to a future Package master
    name:         { type: String, required: true },
    service_type: { type: String, enum: SEGMENT_TYPES, default: 'Package' }, // a.k.a. Segment Type
    supplier:     { type: String }, // GDS or manual supplier
    quantity:     { type: Number, default: 1, min: 0 },
    unit_cost:    { type: Number, default: 0, min: 0 }, // supplier cost — restricted
    unit_price:   { type: Number, default: 0, min: 0 }, // sell price (rupees)
    description:  { type: String },
  },
  { _id: false }
);

const OpportunitySchema = new mongoose.Schema(
  {
    id:        { type: String, required: true, unique: true },
    opp_code:  { type: String, unique: true, sparse: true, index: true },

    // §4.3 naming convention: "[Account] — [Destination] [Type] — [Mon YYYY]".
    name:      { type: String },

    // Link back to the originating lead (Lead.id is a string). Optional.
    lead_id:   { type: String, index: true },
    // Link to the customer "account" (Customer.id is a string). Optional.
    customer_id: { type: String, index: true },

    // Denormalised display fields so the board renders without joins.
    customer_name: { type: String },
    email:         { type: String, lowercase: true, trim: true },
    mobile:        { type: String },
    destination:   { type: String },
    source:        { type: String },

    opp_type:    { type: String, enum: OPP_TYPES }, // §5.2 Type
    travel_start: { type: Date },
    travel_end:   { type: Date },
    travellers:   { type: Number, default: 0 },

    // Packages / services the customer is taking on this deal.
    line_items: { type: [LineItemSchema], default: [] },

    owner:     { type: String }, // assigned agent name (mirrors Lead.assigned_to)
    priority:  { type: String, enum: ['Hot', 'Normal', 'Cold'], default: 'Normal' },

    stage:     { type: String, enum: STAGES, default: 'Qualification' },
    status:    { type: String, enum: ['Open', 'Won', 'Lost'], default: 'Open' },

    estimated_value:     { type: Number, default: 0 },  // Amount (sell) in rupees
    supplier_cost:       { type: Number, default: 0 },  // restricted — sum of line costs
    margin:              { type: Number, default: 0 },  // restricted — value − cost
    expected_revenue:    { type: Number, default: 0 },  // Amount × Probability (auto)
    probability:         { type: Number, default: 10, min: 0, max: 100 },
    forecast_category:   { type: String, default: 'Pipeline' },
    expected_close_date: { type: Date },
    board_position:      { type: Number, default: 0 },

    competitor:  { type: String, enum: COMPETITORS, default: 'None' },
    next_step:   { type: String },

    lost_reason: { type: String, enum: LOSS_REASONS }, // §5.5 fixed picklist
    won_at:      { type: Date },
    lost_at:     { type: Date },

    notes: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

OpportunitySchema.index({ stage: 1, board_position: 1 });
OpportunitySchema.index({ owner: 1, status: 1 });

// Derive money + forecast fields before every save:
//  • Amount/cost from line items when present (sell & cost sums).
//  • Margin = amount − cost.
//  • Expected revenue = amount × probability.
//  • Forecast category from the current stage.
OpportunitySchema.pre('save', function () {
  if (Array.isArray(this.line_items) && this.line_items.length > 0) {
    this.estimated_value = this.line_items.reduce(
      (sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0), 0);
    this.supplier_cost = this.line_items.reduce(
      (sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unit_cost) || 0), 0);
  }
  this.margin = (Number(this.estimated_value) || 0) - (Number(this.supplier_cost) || 0);
  this.expected_revenue = Math.round((Number(this.estimated_value) || 0) * (Number(this.probability) || 0) / 100);
  this.forecast_category = FORECAST_CATEGORY[this.stage] || 'Pipeline';
});

// Atomic auto-incrementing Opportunity Code: OPP-100001, OPP-100002, ...
OpportunitySchema.statics.nextOppCode = async function () {
  const Counter = require('./Counter');
  const seq = await Counter.bump('opp_code', 100000);
  return `OPP-${seq}`;
};

// Map a stage to the lifecycle status it implies.
OpportunitySchema.statics.statusForStage = function (stage) {
  if (stage === 'Closed-Won') return 'Won';
  if (stage === 'Closed-Lost') return 'Lost';
  return 'Open';
};

OpportunitySchema.statics.STAGES = STAGES;
OpportunitySchema.statics.STAGE_PROBABILITY = STAGE_PROBABILITY;
OpportunitySchema.statics.FORECAST_CATEGORY = FORECAST_CATEGORY;
OpportunitySchema.statics.SERVICE_TYPES = SEGMENT_TYPES;
OpportunitySchema.statics.SEGMENT_TYPES = SEGMENT_TYPES;
OpportunitySchema.statics.LOSS_REASONS = LOSS_REASONS;
OpportunitySchema.statics.COMPETITORS = COMPETITORS;
OpportunitySchema.statics.OPP_TYPES = OPP_TYPES;

module.exports = mongoose.model('Opportunity', OpportunitySchema);
