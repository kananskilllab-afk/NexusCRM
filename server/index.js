const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config(); // Hot-reloaded environmental configuration

// Unify Mongoose cache to share the active connection pool between server & travel_crm
try {
  const travelMongoosePath = require.resolve('../travel_crm/node_modules/mongoose');
  require.cache[travelMongoosePath] = require.cache[require.resolve('mongoose')];
  console.log('🔗 Mongoose module cache unified successfully between standard CRM and VoyageCRM.');
} catch (e) {
  console.warn('⚠️ Could not resolve travel_crm Mongoose path:', e.message);
}

const { router: authRouter } = require('./routes/auth');
const leadsRouter = require('./routes/leads');
const usersRouter = require('./routes/users');
const customersRouter = require('./routes/customers');
const suppliersRouter = require('./routes/suppliers');
const loyaltyRouter = require('./routes/loyalty');
const tasksRouter = require('./routes/tasks');
const analyticsRouter = require('./routes/analytics');
const activityFeedRouter = require('./routes/activity_feed');
const travelServicesRouter = require('./routes/travel_services');
const voyageRouter = require('./routes/voyage/index');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize MongoDB Atlas connection & CRM Data Seeder
const mongoose = require('mongoose');
const { seedDatabase } = require('./db/seedCRM');
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI is not defined in environment variables.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('🍃 Connected to MongoDB Atlas successfully');
    await seedDatabase();
  })
  .catch(err => {
    console.error('❌ Failed to connect to MongoDB Atlas:', err);
  });

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/users', usersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/loyalty', loyaltyRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/activity-feed', activityFeedRouter);
app.use('/api/travel-services', travelServicesRouter);
app.use('/api/voyage', voyageRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Nexus CRM API is running', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Nexus CRM API Server running on port ${PORT}`);
});
