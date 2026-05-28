const mongoose = require('mongoose');
const { 
  Tenant, PipelineStage, Contact, Booking, BookingPassenger, BookingSegment 
} = require('../server/models/voyage');

const MONGODB_URI = 'mongodb://travel_admin:Travel%40123@ac-bz4wl8u-shard-00-00.rt6jcal.mongodb.net:27017,ac-bz4wl8u-shard-00-01.rt6jcal.mongodb.net:27017,ac-bz4wl8u-shard-00-02.rt6jcal.mongodb.net:27017/travel_crm?ssl=true&authSource=admin&appName=Travel-CRM-cluster';

async function seedSafely() {
  console.log('🔄 Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected successfully!');

  // 1. Ensure Tenant exists
  let tenant = await Tenant.findOne();
  if (!tenant) {
    console.log('🌱 Creating default Tenant...');
    tenant = await Tenant.create({
      name: 'Voyage Elite Travel',
      plan: 'enterprise',
      settings: { currency: 'INR', timezone: 'Asia/Kolkata', logo_url: '' },
    });
    console.log(`✅ Tenant created: ${tenant._id}`);
  } else {
    console.log(`ℹ️ Tenant already exists: ${tenant._id}`);
  }

  // 2. Ensure Pipeline Stages exist
  const stagesCount = await PipelineStage.countDocuments();
  let stages = [];
  if (stagesCount === 0) {
    console.log('🌱 Seeding Pipeline Stages...');
    stages = await PipelineStage.insertMany([
      { tenant_id: tenant._id, name: 'Enquiry',   position: 1, is_closed_won: false },
      { tenant_id: tenant._id, name: 'Proposal',  position: 2, is_closed_won: false },
      { tenant_id: tenant._id, name: 'Confirmed', position: 3, is_closed_won: true  },
      { tenant_id: tenant._id, name: 'Completed', position: 4, is_closed_won: true  },
    ]);
    console.log('✅ Pipeline Stages seeded successfully!');
  } else {
    stages = await PipelineStage.find().sort({ position: 1 });
    console.log(`ℹ️ Pipeline Stages already exist (${stagesCount})`);
  }

  // 3. Ensure Contact exists for Voyage
  let contact = await Contact.findOne({ email: 'ayesha.khan@email.com' });
  if (!contact) {
    console.log('🌱 Seeding Contact...');
    contact = await Contact.create({
      tenant_id: tenant._id,
      email: 'ayesha.khan@email.com',
      phone: '+919876543210',
      full_name: 'Ayesha Khan',
      source: 'referral',
      lifecycle_stage: 'active',
      lead_score: 85,
    });
    console.log(`✅ Contact created: ${contact.full_name}`);
  } else {
    console.log(`ℹ️ Contact already exists: ${contact.full_name}`);
  }

  // 4. Ensure Bookings exist
  const bookingsCount = await Booking.countDocuments();
  if (bookingsCount <= 1) {
    console.log('🌱 Seeding Bookings...');
    const enquiryStage = stages.find(s => s.name === 'Enquiry') || stages[0];
    const proposalStage = stages.find(s => s.name === 'Proposal') || stages[1];
    const confirmedStage = stages.find(s => s.name === 'Confirmed') || stages[2];

    const bookingsToSeed = [
      {
        tenant_id: tenant._id,
        contact_id: contact._id,
        stage_id: enquiryStage._id,
        destination: 'Maldives Honeymoon',
        status: 'enquiry',
        currency_code: 'INR',
        total_cost_cents: 300000,
        total_sell_cents: 380000,
        travel_dates: { start: new Date('2025-10-05'), end: new Date('2025-10-12') }
      },
      {
        tenant_id: tenant._id,
        contact_id: contact._id,
        stage_id: proposalStage._id,
        destination: 'Swiss Alps Skiing',
        status: 'proposal',
        currency_code: 'INR',
        total_cost_cents: 400000,
        total_sell_cents: 520000,
        travel_dates: { start: new Date('2026-01-20'), end: new Date('2026-01-28') }
      },
      {
        tenant_id: tenant._id,
        contact_id: contact._id,
        stage_id: confirmedStage._id,
        destination: 'Tokyo Tour',
        status: 'confirmed',
        currency_code: 'INR',
        total_cost_cents: 500000,
        total_sell_cents: 650000,
        travel_dates: { start: new Date('2026-04-10'), end: new Date('2026-04-18') }
      }
    ];

    for (const bData of bookingsToSeed) {
      const createdB = await Booking.create(bData);
      console.log(`✅ Seeded Booking to ${createdB.destination}`);

      // Seed Passenger for each Booking
      await BookingPassenger.create({
        booking_id: createdB._id,
        first_name: 'Ayesha',
        last_name: 'Khan',
        dob: new Date('1993-05-20'),
        passport_num: 'P1234567',
        passport_expiry: new Date('2028-05-19'),
        nationality: 'IN',
      });

      // Seed Segment for each Booking
      await BookingSegment.create({
        booking_id: createdB._id,
        segment_type: 'flight',
        status: 'confirmed',
        start_at: createdB.travel_dates.start,
        end_at: createdB.travel_dates.start,
        cost_cents: 60000,
        sell_cents: 75000,
        confirmation_ref: 'IG-' + Math.floor(Math.random() * 100000),
      });
    }
    console.log('✅ Bookings and segments seeded successfully!');
  } else {
    console.log(`ℹ️ Bookings already exist (${bookingsCount})`);
  }

  await mongoose.disconnect();
  console.log('🍃 Disconnected cleanly.');
}

seedSafely().catch(console.error);
