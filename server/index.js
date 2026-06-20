const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
// Load .env from this file's directory regardless of where node was invoked.
require('dotenv').config({ path: path.join(__dirname, '.env') });

// All models (NexusCRM + Voyage) live under server/models/, so a single
// mongoose instance is used throughout. No connection-pool gymnastics needed.

const { router: authRouter } = require('./routes/auth');
const leadsRouter = require('./routes/leads');
const opportunitiesRouter = require('./routes/opportunities');
const usersRouter = require('./routes/users');
const customersRouter = require('./routes/customers');
const suppliersRouter = require('./routes/suppliers');
const loyaltyRouter = require('./routes/loyalty');
const tasksRouter = require('./routes/tasks');
const analyticsRouter = require('./routes/analytics');
const activityFeedRouter = require('./routes/activity_feed');
const travelServicesRouter = require('./routes/travel_services');
const voyageRouter = require('./routes/voyage/index');
const quotesRouter = require('./routes/quotes');
const invoicesRouter = require('./routes/invoices');
const notificationsRouter = require('./routes/notifications');
const integrationsRouter = require('./routes/integrations');
const communicationsRouter = require('./routes/communications');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize MongoDB Atlas connection & CRM Data Seeder
const mongoose = require('mongoose');
const { seedDatabase } = require('./db/seedCRM');
const { initializeDefaultTemplates } = require('./utils/automation');
const { startScheduler } = require('./utils/scheduler');
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI is not defined in environment variables.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('🍃 Connected to MongoDB Atlas successfully');
    await seedDatabase();
    await initializeDefaultTemplates();
    startScheduler();
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
// Public (unauthenticated) share-link routes — Stage 8 customer review
if (leadsRouter.publicRoutes) app.use('/api/public', leadsRouter.publicRoutes);
app.use('/api/opportunities', opportunitiesRouter);
app.use('/api/users', usersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/loyalty', loyaltyRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/activity-feed', activityFeedRouter);
app.use('/api/travel-services', travelServicesRouter);
app.use('/api/voyage', voyageRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/communications', communicationsRouter);

// Home route message
app.get('/', (req, res) => {
  res.send('<h1>Nexus CRM API Server</h1><p>The backend server is running successfully. Access APIs under <code>/api</code>.</p>');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Nexus CRM API is running', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Nexus CRM API Server running on port ${PORT}`);
});
