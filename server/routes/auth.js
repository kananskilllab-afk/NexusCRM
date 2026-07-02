const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const CRMUser = require('../models/CRMUser');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'nexuscrm_secret';

const ROLE_HIERARCHY = {
  'Super Admin': 5, 'Admin': 4, 'Ops Manager': 3,
  'Ops Staff': 2, 'Accountant': 1, 'Viewer': 0
};

// Map MongoDB role to frontend Nexus role
const mapRole = (mongoRole) => {
  if (mongoRole === 'admin') return 'Admin';
  if (mongoRole === 'manager') return 'Ops Manager';
  if (mongoRole === 'agent') return 'Ops Staff';
  return mongoRole || 'Viewer';
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const user = await CRMUser.findOne({ email: email.toLowerCase(), status: 'Active' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      email_signature: user.email_signature,
      profile_image: user.profile_image,
      signature_fields: user.signature_fields
    };

    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me - verify token
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await CRMUser.findOne({ id: decoded.id });
    if (!user || user.status !== 'Active') return res.status(404).json({ error: 'User not found' });
    
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      email_signature: user.email_signature,
      profile_image: user.profile_image,
      signature_fields: user.signature_fields
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// PUT /api/auth/profile - Any authenticated user can update their own profile
router.put('/profile', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await CRMUser.findOne({ id: decoded.id });
    if (!user || user.status !== 'Active') return res.status(404).json({ error: 'User not found' });

    const { name, mobile, area, password, smtp_host, smtp_port, smtp_user, smtp_pass, email_signature, profile_image, signature_fields } = req.body;

    if (name !== undefined) user.name = name;
    if (mobile !== undefined) user.mobile = mobile;
    if (area !== undefined) user.area = area;
    if (smtp_host !== undefined) user.smtp_host = smtp_host;
    if (smtp_port !== undefined) user.smtp_port = smtp_port ? parseInt(smtp_port) : undefined;
    if (smtp_user !== undefined) user.smtp_user = smtp_user;
    if (smtp_pass !== undefined) user.smtp_pass = smtp_pass;
    if (email_signature !== undefined) user.email_signature = email_signature;
    if (profile_image !== undefined) user.profile_image = profile_image;
    if (signature_fields !== undefined) user.signature_fields = signature_fields;

    if (password) {
      user.password = bcrypt.hashSync(password, 10);
    }

    await user.save();

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      email_signature: user.email_signature,
      profile_image: user.profile_image,
      signature_fields: user.signature_fields
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile: ' + err.message });
  }
});

module.exports = { router, JWT_SECRET, ROLE_HIERARCHY };
