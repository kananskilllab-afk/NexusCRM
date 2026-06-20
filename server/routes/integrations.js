const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const whatsapp = require('../utils/integrations/whatsapp');
const payments = require('../utils/integrations/payments');
const gds = require('../utils/integrations/gds');

router.use(authenticate);

// GET /api/integrations/status — which Phase-3 integrations are live vs stubbed.
router.get('/status', (req, res) => {
  res.json({
    whatsapp: { configured: whatsapp.isConfigured() },
    payments: { configured: payments.isConfigured() },
    gds: { configured: gds.isConfigured() },
  });
});

// POST /api/integrations/whatsapp/send — { to, message }
router.post('/whatsapp/send', requireRole(1), async (req, res) => {
  const { to, message } = req.body;
  const result = await whatsapp.sendWhatsApp(to, message);
  res.status(result.ok ? 200 : 502).json(result);
});

// POST /api/integrations/payments/link — { amount, description, customer }
router.post('/payments/link', requireRole(1), async (req, res) => {
  try {
    const result = await payments.createPaymentLink(req.body || {});
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    res.status(501).json({ error: err.message });
  }
});

// GET /api/integrations/gds/flights?from=&to=&date=
router.get('/gds/flights', async (req, res) => {
  try {
    const result = await gds.searchFlights(req.query || {});
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    res.status(501).json({ error: err.message });
  }
});

module.exports = router;
