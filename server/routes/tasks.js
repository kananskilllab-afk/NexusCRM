const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { authenticateToken, generateId } = require('../middleware/auth');

// GET tasks for a booking or all tasks
router.get('/', authenticateToken, async (req, res) => {
  const { bookingId, status } = req.query;
  
  try {
    const filter = {};
    if (bookingId) filter.booking_id = bookingId;
    if (status) filter.status = status;
    
    const tasks = await Task.find(filter).sort({ due_date: 1 }).lean();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// CREATE a task
router.post('/', authenticateToken, async (req, res) => {
  const { bookingId, title, dueDate, assignedTo } = req.body;
  const id = generateId('tsk');
  
  try {
    const newTask = await Task.create({
      id,
      booking_id: bookingId,
      title,
      due_date: dueDate,
      assigned_to: assignedTo,
      status: 'Pending'
    });
      
    res.json(newTask);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// UPDATE task status
router.put('/:id', authenticateToken, async (req, res) => {
  const { status } = req.body;
  
  try {
    const updated = await Task.findOneAndUpdate(
      { id: req.params.id },
      { $set: { status } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Task not found' });
      
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

module.exports = router;
