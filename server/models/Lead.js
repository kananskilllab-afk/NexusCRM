const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    first_name: { type: String },
    last_name: { type: String },
    email: { type: String, lowercase: true, trim: true },
    mobile: { type: String },
    status: { type: String, default: 'New' },
    priority: { type: String, default: 'Normal' },
    no_adults: { type: Number, default: 1 },
    no_children: { type: Number, default: 0 },
    no_infants: { type: Number, default: 0 },
    destination: { type: String },
    lead_source: { type: String },
    assigned_to: { type: String },
    travel_start_date: { type: String },
    travel_end_date: { type: String },
    enquiry_types: { type: [String], default: [] },
    enquiry_data: { type: mongoose.Schema.Types.Mixed, default: {} },
    notes: { type: String },
    tags: { type: [String], default: [] }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

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

    await Activity.deleteMany({ lead_id: lead.id });
    await BillingItem.deleteMany({ lead_id: lead.id });
    await Payment.deleteMany({ lead_id: lead.id });
    await FollowUp.deleteMany({ lead_id: lead.id });
    await Communication.deleteMany({ lead_id: lead.id });

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

    const leadIds = leads.map(l => l.id);

    await Activity.deleteMany({ lead_id: { $in: leadIds } });
    await BillingItem.deleteMany({ lead_id: { $in: leadIds } });
    await Payment.deleteMany({ lead_id: { $in: leadIds } });
    await FollowUp.deleteMany({ lead_id: { $in: leadIds } });
    await Communication.deleteMany({ lead_id: { $in: leadIds } });

    console.log(`🧹 Cascading delete completed for multiple Lead IDs: ${leadIds.join(', ')}`);
  } catch (err) {
    console.error('❌ Error in Lead cascading deleteMany pre-hook:', err);
  }
});

module.exports = mongoose.model('Lead', LeadSchema);
