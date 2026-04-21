const jwt = require('jsonwebtoken');
const { JWT_SECRET, ROLE_HIERARCHY } = require('../routes/auth');

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

// Log audit entry
const auditLog = (db, req, action, table, recordId, details) => {
  try {
    db.prepare(`INSERT INTO audit_log (id, user_name, action, table_name, record_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(`audit-${Date.now()}-${Math.random()}`, req.user?.name || 'System', action, table, recordId, details, req.ip);
  } catch (e) { /* non-critical */ }
};

const generateId = (prefix = 'ID') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

module.exports = { authenticate, requireRole, auditLog, generateId };
