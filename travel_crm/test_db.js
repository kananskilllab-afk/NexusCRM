const mongoose = require('mongoose');
const { Booking, PipelineStage, Quote, PaymentSchedule, Commission } = require('./models');

const MONGODB_URI = 'mongodb://travel_admin:Travel%40123@ac-bz4wl8u-shard-00-00.rt6jcal.mongodb.net:27017,ac-bz4wl8u-shard-00-01.rt6jcal.mongodb.net:27017,ac-bz4wl8u-shard-00-02.rt6jcal.mongodb.net:27017/travel_crm?ssl=true&authSource=admin&appName=Travel-CRM-cluster';

async function test() {
  console.log('🔄 Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected successfully!');

  const bookingsCount = await Booking.countDocuments();
  const stagesCount = await PipelineStage.countDocuments();
  const quotesCount = await Quote.countDocuments();
  const schedulesCount = await PaymentSchedule.countDocuments();
  const commissionsCount = await Commission.countDocuments();

  console.log('\n📊 Database Statistics:');
  console.log(`- Bookings: ${bookingsCount}`);
  console.log(`- Pipeline Stages: ${stagesCount}`);
  console.log(`- Quotes: ${quotesCount}`);
  console.log(`- Payment Schedules: ${schedulesCount}`);
  console.log(`- Commissions: ${commissionsCount}`);

  if (bookingsCount > 0) {
    const sample = await Booking.findOne().populate('contact_id').populate('stage_id').lean();
    console.log('\n🔍 Sample Booking Document:');
    console.log({
      id: sample._id.toString(),
      destination: sample.destination,
      client: sample.contact_id ? sample.contact_id.full_name : 'N/A',
      stage: sample.stage_id ? sample.stage_id.name : 'N/A',
      total_sell: sample.total_sell_cents / 100
    });
  }

  await mongoose.disconnect();
  console.log('\n🍃 Disconnected cleanly.');
}

test().catch(console.error);
