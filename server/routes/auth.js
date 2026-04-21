const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'nexuscrm_secret';

const ROLE_HIERARCHY = {
  'Super Admin': 5, 'Admin': 4, 'Ops Manager': 3,
  'Ops Staff': 2, 'Accountant': 1, 'Viewer': 0
};

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND status = ?').get(email, 'Active');

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const isValid = bcrypt.compareSync(password, user.password);
  if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  // Audit log
  db.prepare(`INSERT INTO audit_log (id, user_name, action, table_name, record_id, details) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(`audit-${Date.now()}`, user.name, 'LOGIN', 'users', user.id, `Login from ${req.ip}`);

  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me - verify token
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, role, status FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = { router, JWT_SECRET, ROLE_HIERARCHY };
