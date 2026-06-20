const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Communication = require('../models/Communication');
const Lead = require('../models/Lead');

const genId = () =>
  `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// GET /api/communications → latest message per lead (conversation list)
router.get('/', authenticate, async (req, res) => {
  try {
    const conversations = await Communication.aggregate([
      { $sort: { sent_at: -1 } },
      {
        $group: {
          _id: '$lead_id',
          last_message:  { $first: '$content' },
          last_sent_at:  { $first: '$sent_at' },
          channel:       { $first: '$channel' },
          direction:     { $first: '$direction' },
          unread: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$direction', 'inbound'] },
                  { $eq: ['$status', 'Unread'] },
                ]},
                1, 0,
              ],
            },
          },
        },
      },
      { $sort: { last_sent_at: -1 } },
      { $limit: 100 },
    ]);

    // Enrich with lead contact names
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        let contact_name = conv._id;
        try {
          const lead = await Lead.findOne({ id: conv._id })
            .select('first_name last_name')
            .lean();
          if (lead) {
            contact_name =
              `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || conv._id;
          }
        } catch (_) {}
        return {
          contactId:    conv._id,
          contact_name,
          last_message: conv.last_message,
          last_sent_at: conv.last_sent_at,
          channel:      conv.channel || 'Email',
          unread:       conv.unread,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error('❌ GET /communications error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/communications/:contactId → message thread
router.get('/:contactId', authenticate, async (req, res) => {
  try {
    const messages = await Communication.find({ lead_id: req.params.contactId })
      .sort({ sent_at: 1 })
      .lean();

    // Mark inbound unread as read
    await Communication.updateMany(
      { lead_id: req.params.contactId, direction: 'inbound', status: 'Unread' },
      { $set: { status: 'Read' } }
    );

    res.json(messages);
  } catch (err) {
    console.error('❌ GET /communications/:contactId error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/communications/:contactId → send message
router.post('/:contactId', authenticate, async (req, res) => {
  const { content, channel = 'Email' } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });

  try {
    const message = await Communication.create({
      id:        genId(),
      lead_id:   req.params.contactId,
      channel,
      direction: 'outbound',
      content:   content.trim(),
      status:    'Sent',
      sent_by:   req.user?.name || req.user?.email || 'Agent',
    });
    res.status(201).json(message);
  } catch (err) {
    console.error('❌ POST /communications/:contactId error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
