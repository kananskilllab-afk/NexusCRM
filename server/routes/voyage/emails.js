const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const { authenticateToken, generateId } = require('../../middleware/auth');
const { EmailTemplate, EmailSend, Tenant, Contact, Booking } = require('../../../travel_crm/models');
const CRMUser = require('../../models/CRMUser');
const Lead = require('../../models/Lead');
const Communication = require('../../models/Communication');
const Activity = require('../../models/Activity');

// Configure SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Helper function to replace {{variable}} in templates
function replaceTemplateVariables(text, variablesMap) {
  if (!text) return '';
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    return variablesMap[trimmedKey] !== undefined ? variablesMap[trimmedKey] : match;
  });
}


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
      .populate({ path: 'sent_by', model: 'CRMUser', select: 'email' })
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
      is_bulk: s.is_bulk || false,
      status: s.status,
      error_message: s.error_message || '',
      sent_at: s.sent_at ? new Date(s.sent_at).toISOString() : '',
      opened_at: s.opened_at ? new Date(s.opened_at).toISOString() : '',
      created_at: s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : ''
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/voyage/emails/send — send an email using Nodemailer
router.post('/send', authenticateToken, async (req, res) => {
  const { template_id, contact_id, booking_id, to_email, subject, custom_body } = req.body;
  try {
    const tenant = await Tenant.findOne();
    const currentUser = await CRMUser.findOne({ id: req.user.id });

    // 1. Resolve contact info
    let recipientEmail = to_email;
    let contact = null;
    if (contact_id) {
      contact = await Contact.findById(contact_id);
      if (contact && !recipientEmail) {
        recipientEmail = contact.email;
      }
    }

    // 2. Resolve booking / lead info
    let booking = null;
    let lead = null;
    let bookingRef = '';
    let destination = '';
    let totalSell = '0.00';

    if (booking_id) {
      if (mongoose.Types.ObjectId.isValid(booking_id)) {
        booking = await Booking.findById(booking_id);
      }
      if (booking) {
        bookingRef = booking._id.toString();
        destination = booking.destination || 'N/A';
        totalSell = booking.total_sell_cents 
          ? `${booking.currency_code || 'INR'} ${(booking.total_sell_cents / 100).toFixed(2)}` 
          : '0.00';
      } else {
        lead = await Lead.findOne({ id: booking_id });
        if (lead) {
          bookingRef = lead.id;
          destination = lead.destination || 'N/A';
          if (!recipientEmail) {
            recipientEmail = lead.email;
          }
        }
      }
    }

    if (!recipientEmail) {
      return res.status(400).json({ error: 'Recipient email required' });
    }

    // 3. Resolve template or custom body
    let template = null;
    let finalSubject = subject;
    let rawHtml = custom_body || '';

    if (template_id) {
      template = await EmailTemplate.findById(template_id);
      if (template) {
        if (!finalSubject) finalSubject = template.subject;
        rawHtml = template.body_html;
      }
    }

    // 4. Populate template variables if applicable
    const variablesMap = {};
    if (contact) {
      variablesMap['first_name'] = contact.full_name ? contact.full_name.split(' ')[0] : 'Customer';
      variablesMap['full_name'] = contact.full_name || 'Customer';
      variablesMap['email'] = contact.email || '';
    } else if (lead) {
      const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
      variablesMap['first_name'] = lead.first_name || 'Customer';
      variablesMap['full_name'] = fullName || 'Customer';
      variablesMap['email'] = lead.email || '';
    }

    variablesMap['booking_ref'] = bookingRef || '';
    variablesMap['destination'] = destination || 'N/A';
    variablesMap['total_sell'] = totalSell;

    const processedHtml = replaceTemplateVariables(rawHtml, variablesMap);
    const processedSubject = replaceTemplateVariables(finalSubject || 'No Subject', variablesMap);

    // 5. Create database record as "queued"
    const emailSend = await EmailSend.create({
      tenant_id: tenant._id,
      template_id: template_id || undefined,
      contact_id: contact ? contact._id : undefined,
      booking_id: booking ? booking._id : undefined,
      sent_by: currentUser ? currentUser._id : undefined,
      to_email: recipientEmail,
      subject: processedSubject,
      status: 'queued',
    });

    // 6. Setup SMTP Transporter (Personal vs Global)
    let userTransporter = transporter;
    let fromEmail = process.env.FROM_EMAIL;
    if (currentUser && currentUser.smtp_user && currentUser.smtp_pass) {
      userTransporter = nodemailer.createTransport({
        host: currentUser.smtp_host || 'smtp.gmail.com',
        port: parseInt(currentUser.smtp_port || '587'),
        secure: currentUser.smtp_port === 465,
        auth: {
          user: currentUser.smtp_user,
          pass: currentUser.smtp_pass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      fromEmail = `"${currentUser.name}" <${currentUser.smtp_user}>`;
    }

    // 7. Inject Tracking Pixel
    const trackingPixel = `<img src="${req.protocol}://${req.get('host')}/api/voyage/emails/track/${emailSend._id.toString()}" width="1" height="1" style="display:none;" />`;
    const htmlWithTracking = processedHtml + trackingPixel;

    // 8. Send the actual email via SMTP
    try {
      await userTransporter.sendMail({
        from: fromEmail,
        to: recipientEmail,
        subject: processedSubject,
        html: htmlWithTracking || processedSubject, 
      });

      // Update status on success
      emailSend.status = 'sent';
      emailSend.sent_at = new Date();
      await emailSend.save();

      // Log CRM Lead Communication & Activity if it's a lead
      if (lead) {
        try {
          const commId = generateId('comm');
          await Communication.create({
            id: commId,
            lead_id: lead.id,
            channel: 'email',
            direction: 'outbound',
            template_name: template ? template.name : 'Custom',
            content: processedHtml || processedSubject,
            status: 'Sent',
            sent_by: currentUser ? currentUser.name : req.user.name
          });

          await Activity.create({
            id: generateId('act'),
            lead_id: lead.id,
            type: 'Communication',
            text: `Email sent: ${template ? template.name : 'Custom message'}`,
            user_name: currentUser ? currentUser.name : req.user.name
          });
        } catch (logErr) {
          console.error('Failed to log lead communication:', logErr);
        }
      }

      res.status(201).json({ id: emailSend._id.toString(), message: `Email sent successfully to ${recipientEmail}` });
    } catch (mailError) {
      console.error('SMTP sending error:', mailError);
      
      // Update status on failure
      emailSend.status = 'failed';
      emailSend.error_message = mailError.message;
      await emailSend.save();

      res.status(500).json({ error: `SMTP server rejected delivery: ${mailError.message}` });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/voyage/emails/send-bulk — send bulk emails to contacts associated with bookings
router.post('/send-bulk', authenticateToken, async (req, res) => {
  const { booking_ids, template_id, subject, custom_body } = req.body;
  if (!booking_ids || !Array.isArray(booking_ids) || booking_ids.length === 0) {
    return res.status(400).json({ error: 'Array of booking_ids is required' });
  }

  try {
    const tenant = await Tenant.findOne();
    const currentUser = await CRMUser.findOne({ id: req.user.id });

    // Setup SMTP Transporter (Personal vs Global)
    let userTransporter = transporter;
    let fromEmail = process.env.FROM_EMAIL;
    if (currentUser && currentUser.smtp_user && currentUser.smtp_pass) {
      userTransporter = nodemailer.createTransport({
        host: currentUser.smtp_host || 'smtp.gmail.com',
        port: parseInt(currentUser.smtp_port || '587'),
        secure: currentUser.smtp_port === 465,
        auth: {
          user: currentUser.smtp_user,
          pass: currentUser.smtp_pass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      fromEmail = `"${currentUser.name}" <${currentUser.smtp_user}>`;
    }

    // Resolve template if selected
    let template = null;
    let finalSubject = subject;
    let rawHtml = custom_body || '';

    if (template_id) {
      template = await EmailTemplate.findById(template_id);
      if (template) {
        if (!finalSubject) finalSubject = template.subject;
        rawHtml = template.body_html;
      }
    }

    const results = [];

    // Send emails sequentially to respect rate limits
    for (const bookingId of booking_ids) {
      let emailSend = null;
      try {
        let recipientEmail = '';
        let recipientName = '';
        let bookingRef = '';
        let destination = '';
        let totalSell = '0.00';
        let contact = null;
        let booking = null;
        let lead = null;

        if (mongoose.Types.ObjectId.isValid(bookingId)) {
          booking = await Booking.findById(bookingId);
        }

        if (booking) {
          contact = await Contact.findById(booking.contact_id);
          if (contact) {
            recipientEmail = contact.email;
            recipientName = contact.full_name;
          }
          bookingRef = booking._id.toString();
          destination = booking.destination || 'N/A';
          totalSell = booking.total_sell_cents 
            ? `${booking.currency_code || 'INR'} ${(booking.total_sell_cents / 100).toFixed(2)}` 
            : '0.00';
        } else {
          lead = await Lead.findOne({ id: bookingId });
          if (!lead) {
            results.push({ bookingId, status: 'failed', error: 'Booking or Lead not found' });
            continue;
          }
          recipientEmail = lead.email;
          recipientName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
          bookingRef = lead.id;
          destination = lead.destination || 'N/A';
          totalSell = '0.00';
        }

        if (!recipientEmail) {
          results.push({ bookingId, status: 'failed', error: 'Recipient email not found' });
          continue;
        }

        // Variable replacement
        const variablesMap = {
          'first_name': recipientName ? recipientName.split(' ')[0] : 'Customer',
          'full_name': recipientName || 'Customer',
          'email': recipientEmail,
          'booking_ref': bookingRef,
          'destination': destination,
          'total_sell': totalSell
        };

        const processedHtml = replaceTemplateVariables(rawHtml, variablesMap);
        const processedSubject = replaceTemplateVariables(finalSubject || 'No Subject', variablesMap);

        // Create db log as queued
        emailSend = await EmailSend.create({
          tenant_id: tenant._id,
          template_id: template_id || undefined,
          contact_id: contact ? contact._id : undefined,
          booking_id: booking ? booking._id : undefined,
          sent_by: currentUser ? currentUser._id : undefined,
          to_email: recipientEmail,
          subject: processedSubject,
          status: 'queued',
        });

        // Insert Tracking Pixel
        const trackingPixel = `<img src="${req.protocol}://${req.get('host')}/api/voyage/emails/track/${emailSend._id.toString()}" width="1" height="1" style="display:none;" />`;
        const htmlWithTracking = processedHtml + trackingPixel;

        await userTransporter.sendMail({
          from: fromEmail,
          to: recipientEmail,
          subject: processedSubject,
          html: htmlWithTracking || processedSubject,
        });

        emailSend.status = 'sent';
        emailSend.sent_at = new Date();
        await emailSend.save();

        // Log CRM Lead Communication & Activity if it's a lead
        if (lead) {
          try {
            const commId = generateId('comm');
            await Communication.create({
              id: commId,
              lead_id: lead.id,
              channel: 'email',
              direction: 'outbound',
              template_name: template ? template.name : 'Custom',
              content: processedHtml || processedSubject,
              status: 'Sent',
              sent_by: currentUser ? currentUser.name : req.user.name
            });

            await Activity.create({
              id: generateId('act'),
              lead_id: lead.id,
              type: 'Communication',
              text: `Email sent: ${template ? template.name : 'Custom message'}`,
              user_name: currentUser ? currentUser.name : req.user.name
            });
          } catch (logErr) {
            console.error('Failed to log lead communication:', logErr);
          }
        }

        results.push({ bookingId, to: recipientEmail, status: 'sent', emailSendId: emailSend._id });
      } catch (err) {
        console.error(`Failed to send bulk email for booking ${bookingId}:`, err);
        if (emailSend) {
          try {
            emailSend.status = 'failed';
            emailSend.error_message = err.message;
            await emailSend.save();
          } catch (saveErr) {}
        }
        results.push({ bookingId, status: 'failed', error: err.message });
      }
    }

    res.status(200).json({ message: `Bulk email process finished.`, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/voyage/emails/track/:emailSendId — tracking pixel endpoint
router.get('/track/:emailSendId', async (req, res) => {
  const { emailSendId } = req.params;
  try {
    const emailSend = await EmailSend.findById(emailSendId);
    if (emailSend && emailSend.status !== 'opened') {
      emailSend.status = 'opened';
      emailSend.opened_at = new Date();
      await emailSend.save();
    }
  } catch (err) {
    console.error('Tracking pixel error:', err);
  }

  // Return a transparent 1x1 GIF image
  const gif = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': gif.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  });
  res.end(gif);
});

module.exports = router;
