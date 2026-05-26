const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const { EmailTemplate, EmailSend, Tenant } = require('../../travel_crm/models');
const CRMUser = require('../models/CRMUser');
const Communication = require('../models/Communication');
const Activity = require('../models/Activity');
const { generateId } = require('../middleware/auth');

// Default global transporter setup
const globalTransporter = nodemailer.createTransport({
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

async function sendAutomatedEmail(lead, templateName, customVariables = {}) {
  try {
    // 1. Resolve template
    const template = await EmailTemplate.findOne({ name: templateName, is_active: true });
    if (!template) {
      console.warn(`[Automation] Active template "${templateName}" not found. Skipping.`);
      return;
    }

    // 2. Resolve assigned agent & SMTP settings
    const agent = await CRMUser.findOne({ name: lead.assigned_to });
    
    let transporter = globalTransporter;
    let fromEmail = process.env.FROM_EMAIL;

    if (agent && agent.smtp_user && agent.smtp_pass) {
      transporter = nodemailer.createTransport({
        host: agent.smtp_host || 'smtp.gmail.com',
        port: parseInt(agent.smtp_port || '587'),
        secure: agent.smtp_port === 465,
        auth: {
          user: agent.smtp_user,
          pass: agent.smtp_pass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      fromEmail = `"${agent.name}" <${agent.smtp_user}>`;
    }

    // 3. Resolve template variables
    const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
    const variablesMap = {
      'first_name': lead.first_name || 'Customer',
      'full_name': fullName || 'Customer',
      'email': lead.email || '',
      'booking_ref': lead.id,
      'destination': lead.destination || 'N/A',
      'total_sell': '0.00',
      ...customVariables
    };

    const replaceVars = (text) => {
      if (!text) return '';
      return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const trimmed = key.trim();
        return variablesMap[trimmed] !== undefined ? variablesMap[trimmed] : match;
      });
    };

    const processedHtml = replaceVars(template.body_html);
    const processedSubject = replaceVars(template.subject || 'No Subject');

    // 4. Log in EmailSend
    const tenant = await Tenant.findOne();
    const emailSend = await EmailSend.create({
      tenant_id: tenant._id,
      template_id: template._id,
      sent_by: agent ? agent._id : undefined,
      is_bulk: false,
      to_email: lead.email,
      subject: processedSubject,
      status: 'queued'
    });

    // 5. Inject tracking pixel
    const trackingPixel = `<img src="${process.env.APP_URL || 'http://localhost:5005'}/api/voyage/emails/track/${emailSend._id.toString()}" width="1" height="1" style="display:none;" />`;
    const htmlWithTracking = processedHtml + trackingPixel;

    // 6. Deliver email
    try {
      await transporter.sendMail({
        from: fromEmail,
        to: lead.email,
        subject: processedSubject,
        html: htmlWithTracking || processedSubject
      });

      emailSend.status = 'sent';
      emailSend.sent_at = new Date();
      await emailSend.save();
    } catch (sendErr) {
      emailSend.status = 'failed';
      emailSend.error_message = sendErr.message;
      await emailSend.save();
      throw sendErr;
    }

    // 7. Log in CRM Communications and Activities
    const commId = generateId('comm');
    await Communication.create({
      id: commId,
      lead_id: lead.id,
      channel: 'email',
      direction: 'outbound',
      template_name: templateName,
      content: processedHtml || processedSubject,
      status: 'Sent',
      sent_by: agent ? agent.name : 'System'
    });

    await Activity.create({
      id: generateId('act'),
      lead_id: lead.id,
      type: 'Communication',
      text: `Automated email sent: ${templateName}`,
      user_name: agent ? agent.name : 'System'
    });

    console.log(`[Automation] Automated email "${templateName}" sent successfully to ${lead.email}`);

  } catch (err) {
    console.error(`[Automation] Failed to send automated email "${templateName}":`, err);
  }
}

async function initializeDefaultTemplates() {
  try {
    const tenant = await Tenant.findOne();
    if (!tenant) return;

    const defaults = [
      {
        name: 'Enquiry Welcome',
        subject: 'Thank you for your enquiry – {{destination}}',
        body_html: '<p>Dear {{first_name}},</p><p>Thank you for submitting your travel enquiry for {{destination}}! One of our travel agents will get back to you shortly.</p>',
        category: 'other',
        is_active: true
      },
      {
        name: 'Booking Confirmation',
        subject: 'Your booking is confirmed – {{booking_ref}}',
        body_html: '<p>Dear {{first_name}},</p><p>Your booking is confirmed. Your booking reference is {{booking_ref}} for {{destination}}.</p>',
        category: 'confirmation',
        is_active: true
      },
      {
        name: 'Payment Reminder',
        subject: 'Payment due on {{due_date}} – {{booking_ref}}',
        body_html: '<p>Hi {{first_name}},</p><p>Your payment of {{amount}} is due on {{due_date}} for booking {{booking_ref}}.</p>',
        category: 'payment_reminder',
        is_active: true
      },
      {
        name: 'Booking Cancelled',
        subject: 'Booking Cancelled – {{booking_ref}}',
        body_html: '<p>Dear {{first_name}},</p><p>Your booking {{booking_ref}} has been cancelled. A refund of {{refund_amount}} has been processed.</p>',
        category: 'cancellation',
        is_active: true
      }
    ];

    for (const item of defaults) {
      const exists = await EmailTemplate.findOne({ name: item.name });
      if (!exists) {
        await EmailTemplate.create({
          tenant_id: tenant._id,
          ...item
        });
        console.log(`[Automation] Default template "${item.name}" created successfully.`);
      }
    }
  } catch (err) {
    console.error('[Automation] Failed to initialize default templates:', err);
  }
}

// Automatically initialize default templates when the module is loaded
setTimeout(() => {
  initializeDefaultTemplates();
}, 2000);

module.exports = { sendAutomatedEmail };
