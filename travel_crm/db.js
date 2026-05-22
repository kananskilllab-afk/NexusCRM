// db.js — MongoDB connection helper
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/travel_crm';

async function connect() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected:', MONGO_URI);
}

module.exports = { connect };
