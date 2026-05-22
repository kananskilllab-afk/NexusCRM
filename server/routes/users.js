const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const CRMUser = require('../models/CRMUser');
const { authenticate, requireRole, auditLog, generateId } = require('../middleware/auth');

// All user routes require authentication and Super Admin (level 5) role
router.use(authenticate);
router.use(requireRole(5));

// GET /api/users - List all users
router.get('/', async (req, res) => {
  try {
    const users = await CRMUser.find({}, '-password').sort({ created_at: -1 }).lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// POST /api/users - Create a new user
router.post('/', async (req, res) => {
  const id = generateId('U');
  const { name, email, password, role = 'Viewer', status = 'Active', area, mobile, assigned_to } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = await CRMUser.create({
      id,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      status,
      area,
      mobile,
      assigned_to
    });

    auditLog(null, req, 'CREATE', 'users', id, `Created user: ${name} (${role})`);
    
    const userJson = newUser.toJSON();
    delete userJson.password;
    res.status(201).json(userJson);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PATCH /api/users/:id - Update user
router.patch('/:id', async (req, res) => {
  const userId = req.params.id;
  
  try {
    const currentUser = await CRMUser.findOne({ id: userId });
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    const { name, email, role, status, area, mobile, assigned_to, password } = req.body;
    const updates = {};
    
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email.toLowerCase();
    if (role !== undefined) {
      if (currentUser.role === 'Super Admin' && role !== 'Super Admin') {
        const superAdminsCount = await CRMUser.countDocuments({ role: 'Super Admin', status: 'Active' });
        if (superAdminsCount <= 1) {
          return res.status(400).json({ error: 'Cannot demote the last Active Super Admin' });
        }
      }
      updates.role = role;
    }
    if (status !== undefined) updates.status = status;
    if (area !== undefined) updates.area = area;
    if (mobile !== undefined) updates.mobile = mobile;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    
    if (password) {
      updates.password = bcrypt.hashSync(password, 10);
    }

    if (Object.keys(updates).length === 0) {
      const userJson = currentUser.toJSON();
      delete userJson.password;
      return res.json(userJson);
    }

    const updatedUser = await CRMUser.findOneAndUpdate(
      { id: userId },
      { $set: updates },
      { new: true }
    );
      
    auditLog(null, req, 'UPDATE', 'users', userId, `Updated user properties`);
    
    const userJson = updatedUser.toJSON();
    delete userJson.password;
    res.json(userJson);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await CRMUser.findOne({ id: userId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.role === 'Super Admin') {
      const superAdminsCount = await CRMUser.countDocuments({ role: 'Super Admin', status: 'Active' });
      if (superAdminsCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last Super Admin' });
      }
    }

    await CRMUser.deleteOne({ id: userId });
    auditLog(null, req, 'DELETE', 'users', userId, `Deleted user: ${user.name}`);
    
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
