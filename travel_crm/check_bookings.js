const mongoose = require('mongoose');
const { Booking, Tenant, PipelineStage } = require('./models');

const MONGODB_URI = 'mongodb://travel_admin:Travel%40123@ac-bz4wl8u-shard-00-00.rt6jcal.mongodb.net:27017,ac-bz4wl8u-shard-00-01.rt6jcal.mongodb.net:27017,ac-bz4wl8u-shard-00-02.rt6jcal.mongodb.net:27017/travel_crm?ssl=true&authSource=admin&appName=Travel-CRM-cluster';

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const bookings = await Booking.find().lean();
  console.log('Existing bookings count:', bookings.length);
  bookings.forEach(b => {
    console.log(`Booking ID: ${b._id}, Destination: ${b.destination}, Status: ${b.status}, Stage ID: ${b.stage_id}`);
  });

  const stages = await PipelineStage.find().lean();
  console.log('Pipeline stages count:', stages.length);
  stages.forEach(s => {
    console.log(`Stage ID: ${s._id}, Name: ${s.name}, Position: ${s.position}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
