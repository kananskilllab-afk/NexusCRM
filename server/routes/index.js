// Aggregator for all top-level NexusCRM routers.
// server/index.js mounts these under their paths. Voyage sub-routes
// remain under ./voyage/ for clear scoping.

module.exports = {
  authRouter:            require('./auth').router,
  leadsRouter:           require('./leads'),
  usersRouter:           require('./users'),
  customersRouter:       require('./customers'),
  suppliersRouter:       require('./suppliers'),
  loyaltyRouter:         require('./loyalty'),
  tasksRouter:           require('./tasks'),
  analyticsRouter:       require('./analytics'),
  activityFeedRouter:    require('./activity_feed'),
  travelServicesRouter:  require('./travel_services'),
  voyageRouter:          require('./voyage/index'),
  quotesRouter:          require('./quotes'),
  invoicesRouter:        require('./invoices')
};
