const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const Package = require('../models/Package');

const toClient = (p) => ({ ...p.toObject ? p.toObject() : p, id: p._id.toString() });

// GET /api/packages — all users can view
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const packages = await Package.find(filter).sort({ created_at: -1 }).lean();
    res.json(packages.map(p => ({ ...p, id: p._id.toString() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/packages/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    res.json(toClient(pkg));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/packages — Ops Manager (3) and above
router.post('/', authenticateToken, requireRole(3), async (req, res) => {
  try {
    const pkg = new Package({ ...req.body, createdBy: req.user?.name });
    await pkg.save();
    res.status(201).json(toClient(pkg));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/packages/:id — Ops Manager (3) and above
router.put('/:id', authenticateToken, requireRole(3), async (req, res) => {
  try {
    const pkg = await Package.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    res.json(toClient(pkg));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/packages/:id — Admin (4) and above
router.delete('/:id', authenticateToken, requireRole(4), async (req, res) => {
  try {
    const pkg = await Package.findByIdAndDelete(req.params.id);
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    res.json({ message: 'Package deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
