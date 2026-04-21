const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { initializeDatabase, getDb } = require('./db/database');
const { router: authRouter } = require('./routes/auth');
const leadsRouter = require('./routes/leads');
const usersRouter = require('./routes/users');
const customersRouter = require('./routes/customers');
const suppliersRouter = require('./routes/suppliers');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize SQLite DB
initializeDatabase();

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Nexus CRM API is running', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Nexus CRM API Server running on port ${PORT}`);
});
