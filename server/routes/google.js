const express = require('express');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const CRMUser = require('../models/CRMUser');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5005/api/google/callback';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'nexuscrm_secret';

const makeOAuth2Client = (tokens) => {
  const client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  if (tokens) client.setCredentials(tokens);
  return client;
};

// GET /api/google/auth-url
router.get('/auth-url', authenticate, (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(503).json({ error: 'Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to server/.env' });
  }
  const stateToken = (req.headers.authorization || '').replace('Bearer ', '');
  const url = makeOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: stateToken,
    prompt: 'consent',
  });
  res.json({ url });
});

// GET /api/google/callback  (browser redirect from Google)
router.get('/callback', async (req, res) => {
  const { code, state: token, error } = req.query;
  if (error || !code || !token) {
    return res.redirect(`${CLIENT_URL}/scheduler?google=error`);
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const oAuth2Client = makeOAuth2Client();
    const { tokens } = await oAuth2Client.getToken(code);
    await CRMUser.updateOne({ id: decoded.id }, { google_tokens: tokens });
    res.redirect(`${CLIENT_URL}/scheduler?google=connected`);
  } catch (err) {
    console.error('Google callback error:', err.message);
    res.redirect(`${CLIENT_URL}/scheduler?google=error`);
  }
});

// GET /api/google/status
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = await CRMUser.findOne({ id: req.user.id });
    res.json({ connected: !!(user?.google_tokens?.access_token) });
  } catch (err) {
    res.json({ connected: false });
  }
});

// DELETE /api/google/disconnect
router.delete('/disconnect', authenticate, async (req, res) => {
  try {
    await CRMUser.updateOne({ id: req.user.id }, { $unset: { google_tokens: 1 } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/google/sync
router.post('/sync', authenticate, async (req, res) => {
  try {
    const user = await CRMUser.findOne({ id: req.user.id });
    if (!user?.google_tokens?.access_token) {
      return res.status(400).json({ error: 'Google not connected. Please connect your Google account first.' });
    }

    const oAuth2Client = makeOAuth2Client(user.google_tokens);
    oAuth2Client.on('tokens', async (newTokens) => {
      const merged = { ...user.google_tokens, ...newTokens };
      await CRMUser.updateOne({ id: req.user.id }, { google_tokens: merged });
    });

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const { events = [] } = req.body;

    if (!events.length) {
      return res.json({ synced: 0, message: 'No events to sync.' });
    }

    let synced = 0;
    const errors = [];
    for (const ev of events) {
      try {
        await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: ev.summary,
            description: ev.description || '',
            start: { date: ev.date },
            end: { date: ev.date },
            colorId: ev.colorId || '1',
          },
        });
        synced++;
      } catch (e) {
        errors.push(`${ev.summary}: ${e.message}`);
      }
    }

    res.json({ synced, total: events.length, errors, message: `${synced} of ${events.length} event(s) synced to Google Calendar.` });
  } catch (err) {
    console.error('Google sync error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
