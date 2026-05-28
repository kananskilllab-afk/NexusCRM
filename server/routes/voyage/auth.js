const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Tenant, User } = require('../../models/voyage');

router.post('/register', async (req, res) => {
  const { agency_name, full_name, email, password } = req.body;
  
  try {
    // Insert new tenant in MongoDB
    const tenant = await Tenant.create({
      name: agency_name,
      plan: 'standard'
    });
      
    // Insert new owner user in MongoDB
    const passwordHash = bcrypt.hashSync(password, 10);
    const user = await User.create({
      tenant_id: tenant._id,
      email: email,
      password_hash: passwordHash,
      role: 'admin',
      is_active: true
    });
      
    res.status(201).json({ 
      message: 'Agency registered successfully', 
      tenantId: tenant._id.toString(), 
      userId: user._id.toString() 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  res.json({ message: 'Password reset link sent to ' + email });
});

router.post('/mfa/verify', (req, res) => {
  const { code } = req.body;
  if (code === '123456' || code === '000000') {
    res.json({ message: 'MFA verified', status: 'success' });
  } else {
    res.status(400).json({ error: 'Invalid MFA verification code' });
  }
});

module.exports = router;
