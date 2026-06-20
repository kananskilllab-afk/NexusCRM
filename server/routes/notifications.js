const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/notifications — the current user's recent notifications + unread count.
router.get('/', async (req, res) => {
  try {
    const items = await Notification.find({ user_id: req.user.name })
      .sort({ created_at: -1 })
      .limit(Number(req.query.limit) || 30)
      .lean();
    const unread = await Notification.countDocuments({ user_id: req.user.name, is_read: 0 });
    res.json({ items, unread });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

// GET /api/notifications/unread-count — lightweight poll for the bell badge.
router.get('/unread-count', async (req, res) => {
  try {
    const unread = await Notification.countDocuments({ user_id: req.user.name, is_read: 0 });
    res.json({ unread });
  } catch (err) {
    res.status(500).json({ error: 'Failed to count notifications' });
  }
});

// PATCH /api/notifications/read-all — mark all of the user's notifications read.
router.patch('/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ user_id: req.user.name, is_read: 0 }, { $set: { is_read: 1 } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// PATCH /api/notifications/:id/read — mark one read.
router.patch('/:id/read', async (req, res) => {
  try {
    await Notification.updateOne({ id: req.params.id, user_id: req.user.name }, { $set: { is_read: 1 } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

module.exports = router;
