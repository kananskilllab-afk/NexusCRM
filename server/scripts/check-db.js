const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CRMUserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: 'Viewer' },
    status: { type: String, default: 'Active' },
  },
  { collection: 'crmusers' }
);

const CRMUser = mongoose.model('CRMUser', CRMUserSchema);

async function run() {
  console.log('Connecting to:', process.env.MONGODB_URI);
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');
    const count = await CRMUser.countDocuments({});
    console.log('Number of CRMUsers in database:', count);
    const users = await CRMUser.find({}, 'name email role');
    console.log('Users list:', users);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
