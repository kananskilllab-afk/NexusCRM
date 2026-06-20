const { MongoClient } = require('mongodb');

const SOURCE_URI = 'mongodb://travel_admin:Travel%40123@ac-bz4wl8u-shard-00-00.rt6jcal.mongodb.net:27017,ac-bz4wl8u-shard-00-01.rt6jcal.mongodb.net:27017,ac-bz4wl8u-shard-00-02.rt6jcal.mongodb.net:27017/travel_crm?ssl=true&replicaSet=atlas-fe4fjm-shard-0&authSource=admin&appName=Travel-CRM-cluster';
const DEST_URI = 'mongodb://kananskilllab_db_user:ScgRPKTTWYXGYRGr@ac-zrillmb-shard-00-00.ypvaukw.mongodb.net:27017,ac-zrillmb-shard-00-01.ypvaukw.mongodb.net:27017,ac-zrillmb-shard-00-02.ypvaukw.mongodb.net:27017/travel_crm?ssl=true&authSource=admin';

async function migrate() {
  console.log('🔄 Starting full database migration...');
  const sourceClient = new MongoClient(SOURCE_URI);
  const destClient = new MongoClient(DEST_URI);

  try {
    console.log('🔌 Connecting to Source DB...');
    await sourceClient.connect();
    console.log('✅ Connected to Source DB.');

    console.log('🔌 Connecting to Destination DB...');
    await destClient.connect();
    console.log('✅ Connected to Destination DB.');

    const sourceDb = sourceClient.db();
    const destDb = destClient.db();

    // Get all collections from source
    const collections = await sourceDb.listCollections().toArray();
    console.log(`📂 Found ${collections.length} collections in source database.`);

    for (const colInfo of collections) {
      const colName = colInfo.name;
      
      // Skip system collections if any
      if (colName.startsWith('system.')) {
        continue;
      }

      console.log(`\n📦 Processing collection: "${colName}"...`);
      const sourceCol = sourceDb.collection(colName);
      const destCol = destDb.collection(colName);

      // Fetch documents
      const docs = await sourceCol.find({}).toArray();
      console.log(`📖 Read ${docs.length} documents from source "${colName}".`);

      if (docs.length > 0) {
        // Clear destination collection
        await destCol.deleteMany({});
        console.log(`🗑️ Cleared destination collection "${colName}".`);

        // Insert into destination
        const insertResult = await destCol.insertMany(docs);
        console.log(`✅ Inserted ${insertResult.insertedCount} documents into destination "${colName}".`);
      } else {
        console.log(`⚠️ Collection "${colName}" is empty, skipping copy.`);
      }
    }

    console.log('\n🎉 Database migration finished successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    await sourceClient.close();
    await destClient.close();
    console.log('🔌 Connections closed.');
  }
}

migrate();
