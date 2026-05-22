const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { EmailTemplate, EmailSend, Tenant, Contact } = require('../../../travel_crm/models');

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

// GET /api/voyage/emails/templates — list all templates
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const templates = await EmailTemplate.find().sort({ created_at: -1 }).lean();
    const formatted = templates.map(t => ({
      id: t._id.toString(),
      name: t.name,
      subject: t.subject,
      category: t.category,
      variables: t.variables || [],
      is_active: t.is_active,
      body_html: t.body_html,
      body_text: t.body_text || '',
      created_at: t.created_at ? new Date(t.created_at).toISOString().split('T')[0] : ''
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/voyage/emails/templates — create a template
router.post('/templates', authenticateToken, async (req, res) => {
  const { name, subject, body_html, body_text, category, variables } = req.body;
  try {
    const tenant = await Tenant.findOne();
    const template = await EmailTemplate.create({
      tenant_id: tenant._id,
      name,
      subject,
      body_html,
      body_text,
      category: category || 'other',
      variables: variables || []
    });
    res.status(201).json({ id: template._id.toString(), message: 'Template created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/voyage/emails/templates/:id — update a template
router.put('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await EmailTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Template not found' });
    res.json({ message: 'Template updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/voyage/emails/templates/:id
router.delete('/templates/:id', authenticateToken, async (req, res) => {
  try {
    await EmailTemplate.findByIdAndDelete(req.params.id);
    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EMAIL SENDS / HISTORY ───────────────────────────────────────────────────

// GET /api/voyage/emails/history — list all sent emails
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const filter = {};
    if (req.query.contact_id) filter.contact_id = req.query.contact_id;
    if (req.query.booking_id) filter.booking_id = req.query.booking_id;

    const sends = await EmailSend.find(filter)
      .populate('template_id', 'name category')
      .populate('contact_id', 'full_name')
      .populate('sent_by', 'email')
      .sort({ created_at: -1 })
      .lean();

    const formatted = sends.map(s => ({
      id: s._id.toString(),
      to_email: s.to_email,
      subject: s.subject,
      template: s.template_id ? s.template_id.name : 'Custom',
      category: s.template_id ? s.template_id.category : 'other',
      contact: s.contact_id ? s.contact_id.full_name : '',
      sent_by: s.sent_by ? s.sent_by.email : '',
      status: s.status,
      sent_at: s.sent_at ? new Date(s.sent_at).toISOString() : '',
      opened_at: s.opened_at ? new Date(s.opened_at).toISOString() : '',
      created_at: s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : ''
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/voyage/emails/send — send an email (mock — logs to DB)
router.post('/send', authenticateToken, async (req, res) => {
  const { template_id, contact_id, booking_id, to_email, subject, custom_body } = req.body;
  try {
    const tenant = await Tenant.findOne();

    // If a template is selected, pull its subject
    let finalSubject = subject;
    if (template_id && !subject) {
      const tpl = await EmailTemplate.findById(template_id);
      if (tpl) finalSubject = tpl.subject;
    }

    // Resolve recipient email
    let recipientEmail = to_email;
    if (!recipientEmail && contact_id) {
      const contact = await Contact.findById(contact_id);
      if (contact) recipientEmail = contact.email;
    }
    if (!recipientEmail) return res.status(400).json({ error: 'Recipient email required' });

    const emailSend = await EmailSend.create({
      tenant_id: tenant._id,
      template_id: template_id || undefined,
      contact_id: contact_id || undefined,
      booking_id: booking_id || undefined,
      sent_by: req.user.id.match(/^[0-9a-fA-F]{24}$/) ? req.user.id : undefined,
      to_email: recipientEmail,
      subject: finalSubject || 'No Subject',
      status: 'sent',
      sent_at: new Date()
    });

    res.status(201).json({ id: emailSend._id.toString(), message: `Email sent to ${recipientEmail}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
