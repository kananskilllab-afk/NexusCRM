// Barrel export so callers can do:
//   const { Lead, Activity } = require('../models');
// Existing single-file requires continue to work unchanged.

// Lead domain
const Lead             = require('./Lead');
const Activity         = require('./Activity');
const FollowUp         = require('./FollowUp');
const BillingItem      = require('./BillingItem');
const Payment          = require('./Payment');
const AssignedSupplier = require('./AssignedSupplier');
const Communication    = require('./Communication');

// Customer domain
const Customer       = require('./Customer');
const LoyaltyPoints  = require('./LoyaltyPoints');

// Finance domain
const Quote   = require('./Quote');
const Invoice = require('./Invoice');

// Supplier domain
const Supplier     = require('./Supplier');
const SupplierRate = require('./SupplierRate');

// System / auth
const CRMUser     = require('./CRMUser');
const ApiKey      = require('./ApiKey');
const AuditLog    = require('./AuditLog');
const Counter     = require('./Counter');
const Notification = require('./Notification');
const SavedFilter = require('./SavedFilter');
const Task        = require('./Task');

module.exports = {
  // Lead domain
  Lead, Activity, FollowUp, BillingItem, Payment, AssignedSupplier, Communication,
  // Customer
  Customer, LoyaltyPoints,
  // Finance
  Quote, Invoice,
  // Supplier
  Supplier, SupplierRate,
  // System
  CRMUser, ApiKey, AuditLog, Counter, Notification, SavedFilter, Task
};
