const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { authenticate, requireRole, auditLog, generateId } = require('../middleware/auth');

// All user routes require authentication and Super Admin (level 5) role
router.use(authenticate);
router.use(requireRole(5));

// GET /api/users - List all users
router.get('/', (req, res) => {
  const db = getDb();
  // Don't return passwords
  const users = db.prepare('SELECT id, name, email, role, status, area, mobile, assigned_to, created_at, updated_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

// POST /api/users - Create a new user
router.post('/', (req, res) => {
  const db = getDb();
  const id = generateId('U');
  const { name, email, password, role = 'Viewer', status = 'Active', area, mobile, assigned_to } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare(`
      INSERT INTO users (id, name, email, password, role, status, area, mobile, assigned_to)
      VALUES (@id, @name, @email, @password, @role, @status, @area, @mobile, @assigned_to)
    `).run({ id, name, email, password: hashedPassword, role, status, area, mobile, assigned_to });

    auditLog(db, req, 'CREATE', 'users', id, `Created user: ${name} (${role})`);
    
    const newUser = db.prepare('SELECT id, name, email, role, status, area, mobile, assigned_to, created_at FROM users WHERE id = ?').get(id);
    res.status(201).json(newUser);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PATCH /api/users/:id - Update user
router.patch('/:id', (req, res) => {
  const db = getDb();
  const userId = req.params.id;
  
  // Verify user exists and isn't the last Super Admin being demoted
  const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!currentUser) return res.status(404).json({ error: 'User not found' });

  const { name, email, role, status, area, mobile, assigned_to, password } = req.body;
  const updates = {};
  
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (role !== undefined) {
    // Basic protection against removing the last super admin
    if (currentUser.role === 'Super Admin' && role !== 'Super Admin') {
      const superAdminsCount = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'Super Admin' AND status = 'Active'`).get().count;
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

  if (Object.keys(updates).length === 0) return res.json({ message: 'No updates provided' });

  const setClause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
  
  try {
    db.prepare(`UPDATE users SET ${setClause}, updated_at = datetime('now') WHERE id = @id`)
      .run({ ...updates, id: userId });
      
    auditLog(db, req, 'UPDATE', 'users', userId, `Updated user properties`);
    
    const updatedUser = db.prepare('SELECT id, name, email, role, status, area, mobile, assigned_to, updated_at FROM users WHERE id = ?').get(userId);
    res.json(updatedUser);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', (req, res) => {
  const db = getDb();
  const userId = req.params.id;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.role === 'Super Admin') {
    const superAdminsCount = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'Super Admin' AND status = 'Active'`).get().count;
    if (superAdminsCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last Super Admin' });
    }
  }

  // Soft delete typically better for CRM to preserve history, but implementing hard delete as requested
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  auditLog(db, req, 'DELETE', 'users', userId, `Deleted user: ${user.name}`);
  
  res.json({ message: 'User deleted successfully' });
});

module.exports = router;
