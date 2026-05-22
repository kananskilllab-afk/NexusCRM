const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://travel_admin:Travel%40123@ac-bz4wl8u-shard-00-00.rt6jcal.mongodb.net:27017,ac-bz4wl8u-shard-00-01.rt6jcal.mongodb.net:27017,ac-bz4wl8u-shard-00-02.rt6jcal.mongodb.net:27017/travel_crm?ssl=true&authSource=admin&appName=Travel-CRM-cluster';

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected! Dropping indexes...');

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  for (const col of collections) {
    const name = col.name;
    console.log(`Checking indexes for collection: ${name}`);
    try {
      const collection = db.collection(name);
      const indexes = await collection.indexes();
      for (const idx of indexes) {
        if (idx.name !== '_id_') {
          console.log(`Dropping index ${idx.name} from collection ${name}`);
          await collection.dropIndex(idx.name);
        }
      }
    } catch (err) {
      console.error(`Error processing collection ${name}:`, err.message);
    }
  }

  console.log('✅ Finished dropping legacy indexes!');
  await mongoose.disconnect();
}

main().catch(console.error);
