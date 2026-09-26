const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: 'server/.env' });
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus_crm';

mongoose.connect(uri).then(async () => {
  const CRMUser = require('../models/CRMUser');
  const hash = bcrypt.hashSync('nexus123', 10);
  
  const result = await CRMUser.updateMany(
    { $or: [{ raw_password: { $exists: false } }, { raw_password: null }, { raw_password: '' }] },
    { $set: { raw_password: 'nexus123', password: hash } }
  );
  console.log('✅ Successfully updated users with raw_password:', result.modifiedCount);

  const all = await CRMUser.find({}).lean();
  all.forEach(u => console.log('  👤', u.email, '| Role:', u.role, '| Password:', u.raw_password));
  process.exit(0);
}).catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
