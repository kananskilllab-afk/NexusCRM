const express = require('express');
const router = express.Router();
const authRouter = require('./auth');
const bookingsRouter = require('./bookings');
const pipelineRouter = require('./pipeline');
const itineraryRouter = require('./itinerary');
const financeRouter = require('./finance');
const passengersRouter = require('./passengers');
const segmentsRouter = require('./segments');
const contractsRouter = require('./contracts');
const documentsRouter = require('./documents');
const emailsRouter = require('./emails');

// Attach sub-routers
router.use('/auth', authRouter);
router.use('/bookings', bookingsRouter);
router.use('/pipeline', pipelineRouter);
router.use('/itinerary', itineraryRouter);
router.use('/finance', financeRouter);
router.use('/passengers', passengersRouter);
router.use('/segments', segmentsRouter);
router.use('/contracts', contractsRouter);
router.use('/documents', documentsRouter);
router.use('/emails', emailsRouter);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'Voyage CRM extension is active' });
});

module.exports = router;
