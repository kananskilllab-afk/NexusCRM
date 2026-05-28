const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    salutation: { type: String },
    first_name: { type: String, required: true },
    last_name: { type: String },
    email: { type: String, lowercase: true, trim: true },
    mobile: { type: String },
    phone: { type: String },
    city: { type: String },
    address: { type: String },
    date_of_birth: { type: String },
    anniversary: { type: String },
    customer_type: { type: String, default: 'Individual' },
    source: { type: String },
    tags: { type: [String], default: [] },
    notes: { type: String },
    created_by: { type: String },
    preferred_currency: { type: String, default: 'INR' },
    notification_enabled: { type: Number, default: 1 },
    two_factor_enabled: { type: Number, default: 0 },
    two_factor_secret: { type: String },
    backup_codes: { type: String },
    lead_score: { type: Number, default: 0 },
    gdpr_consent_at: { type: String },
    preferences_json: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// --- MongoDB Unified Sync & Cascade Deletion Hooks ---

// 1. Post-Save Sync: Automatically mirror Customer creations/updates to Voyage Contacts
CustomerSchema.post('save', async function (doc) {
  try {
    const { Contact, Tenant } = require('./voyage');

    // Find the first or default Tenant in VoyageCRM
    const tenant = await Tenant.findOne();
    if (!tenant) {
      console.log('⚠️ No active Tenant found in VoyageCRM. Skipping Customer to Contact sync.');
      return;
    }

    const emailSearch = doc.email ? doc.email.toLowerCase() : null;
    const phoneSearch = doc.mobile || doc.phone;
    const fullName = `${doc.first_name || ''} ${doc.last_name || ''}`.trim();

    // Check if Voyage Contact already exists
    let voyageContact = null;
    if (emailSearch) {
      voyageContact = await Contact.findOne({ email: emailSearch, tenant_id: tenant._id });
    }
    if (!voyageContact && phoneSearch) {
      voyageContact = await Contact.findOne({ phone: phoneSearch, tenant_id: tenant._id });
    }

    if (voyageContact) {
      // Update existing contact
      voyageContact.full_name = fullName;
      voyageContact.phone = phoneSearch || voyageContact.phone;
      voyageContact.lead_score = doc.lead_score || voyageContact.lead_score;
      await voyageContact.save();
      console.log(`🔄 Synchronized & Updated Voyage Contact for ${fullName}`);
    } else {
      // Create new Voyage contact
      await Contact.create({
        tenant_id: tenant._id,
        full_name: fullName,
        email: emailSearch,
        phone: phoneSearch,
        lifecycle_stage: 'active',
        lead_score: doc.lead_score || 0,
        source: 'web'
      });
      console.log(`➕ Created new synchronized Voyage Contact for ${fullName}`);
    }
  } catch (err) {
    console.error('❌ Failed to sync Customer to Voyage Contact:', err);
  }
});

// 2. Pre-Delete Cascade: Delete LoyaltyPoints and synchronized Voyage Contacts on customer deletion
CustomerSchema.pre('deleteOne', { document: false, query: true }, async function () {
  try {
    const filter = this.getFilter();
    const customer = await this.model.findOne(filter);
    if (!customer) return;

    const { Contact } = require('./voyage');
    const LoyaltyPoints = require('./LoyaltyPoints');

    // 2.1. Cascade Delete associated LoyaltyPoints
    await LoyaltyPoints.deleteMany({ customer_id: customer.id });
    console.log(`🧹 Wiped LoyaltyPoints for Customer ID: ${customer.id}`);

    // 2.2. Cascade Delete synchronized Voyage Contacts
    const searchConditions = [];
    if (customer.email) searchConditions.push({ email: customer.email.toLowerCase() });
    if (customer.mobile) searchConditions.push({ phone: customer.mobile });
    if (customer.phone) searchConditions.push({ phone: customer.phone });

    if (searchConditions.length > 0) {
      await Contact.deleteMany({ $or: searchConditions });
      console.log(`🧹 Deleted synchronized Voyage Contacts for Customer: ${customer.first_name}`);
    }
  } catch (err) {
    console.error('❌ Error in Customer cascading delete pre-hook:', err);
  }
});

module.exports = mongoose.model('Customer', CustomerSchema);
