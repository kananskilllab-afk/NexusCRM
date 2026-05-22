const jwt = require('jsonwebtoken');
const { JWT_SECRET, ROLE_HIERARCHY } = require('../routes/auth');
const AuditLog = require('../models/AuditLog');

// Verify JWT token
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authentication required' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Require minimum role level
const requireRole = (minLevel) => (req, res, next) => {
  const userLevel = ROLE_HIERARCHY[req.user?.role] || 0;
  if (userLevel < minLevel) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

// Log audit entry (database parameter kept for backwards compatibility but unused)
const auditLog = async (db, req, action, table, recordId, details) => {
  try {
    await AuditLog.create({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user_name: req.user?.name || 'System',
      action,
      table_name: table,
      record_id: recordId,
      details,
      ip_address: req.ip
    });
  } catch (e) { /* non-critical */ }
};

const generateId = (prefix = 'ID') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

module.exports = { authenticate, authenticateToken: authenticate, requireRole, auditLog, generateId };
