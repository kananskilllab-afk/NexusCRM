// One-time migration: move existing Opportunity documents and converted Leads
// onto the §5.1 7-stage pipeline. Safe to re-run (idempotent).
//
// Run from the server/ directory:
//   node scripts/migrateOppStages.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Opportunity = require('../models/Opportunity');
const Lead = require('../models/Lead');

// Old 5-stage values → new 7-stage values.
const STAGE_MAP = {
  Inquiry: 'Qualification',
  Quoted: 'Quote Sent',
  Negotiation: 'Negotiation',
  Won: 'Closed-Won',
  Lost: 'Closed-Lost',
};

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('❌ MONGODB_URI not set'); process.exit(1); }
  await mongoose.connect(uri);
  console.log('✅ Connected. Migrating opportunity stages…');

  const opps = await Opportunity.find({ stage: { $in: Object.keys(STAGE_MAP) } });
  let migrated = 0;
  for (const opp of opps) {
    opp.stage = STAGE_MAP[opp.stage] || 'Qualification';
    opp.status = Opportunity.statusForStage(opp.stage);
    opp.probability = Opportunity.STAGE_PROBABILITY[opp.stage];
    await opp.save(); // pre-save hook recomputes value/cost/margin/forecast
    migrated += 1;
  }
  console.log(`   • ${migrated} opportunity(ies) re-staged.`);

  // Leads that already spawned an opportunity should read as Converted.
  const leadRes = await Lead.updateMany(
    { opportunity_id: { $exists: true, $ne: null }, status: { $nin: ['Converted'] } },
    { $set: { status: 'Converted' } }
  );
  console.log(`   • ${leadRes.modifiedCount} lead(s) marked Converted.`);

  await mongoose.disconnect();
  console.log('✅ Migration complete.');
}

run().catch((err) => { console.error('❌ Migration failed:', err); process.exit(1); });
