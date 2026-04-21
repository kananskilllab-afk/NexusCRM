import React from 'react';
import { FiMail, FiMessageCircle, FiX, FiSend } from 'react-icons/fi';

const TEMPLATES = [
  { id: 't1', name: 'Welcome & Introduction', subject: 'Exciting Travel Plans Await!', body: "Hi {{name}}, thank you for reaching out to Nexus CRM. We are excited to help you plan your trip to {{destination}}!" },
  { id: 't2', name: 'Quotation Follow-up', subject: 'Feedback on your {{destination}} Quote', body: "Hi {{name}}, just following up on the quotation we sent yesterday. Does it align with your budget?" },
  { id: 't3', name: 'Payment Reminder', subject: 'Action Required: Payment for {{destination}}', body: "Hi {{name}}, this is a friendly reminder regarding the pending balance of ₹{{balance}} for your upcoming trip." },
  { id: 't4', name: 'Booking Confirmed', subject: 'Great News! Your trip is confirmed', body: "Hi {{name}}, your booking for {{destination}} is now confirmed. Get ready for an amazing adventure!" }
];

const TemplateSelector = ({ lead, type, onClose, onSend }) => {
  const replacePlaceholders = (text) => {
    let result = text.replace('{{name}}', lead.first_name);
    result = result.replace('{{destination}}', lead.destination);
    
    const balance = lead.billing ? (
      (lead.billing.items?.reduce((a, i) => a + (i.price * i.qty * 1.05), 0) || 0) - 
      (lead.billing.payments?.reduce((a, p) => a + Number(p.amount), 0) || 0)
    ) : 0;
    
    result = result.replace('{{balance}}', Math.max(0, balance).toLocaleString());
    return result;
  };

  return (
    <div className="receipt-overlay no-print" style={{ alignItems: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '24px' }}>
        <div className="section-header">
           <h3>Send {type} Template</h3>
           <button className="btn-icon" onClick={onClose}><FiX /></button>
        </div>
        
        <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
          Select a pre-configured template to send to {type === 'Email' ? lead.email : lead.mobile}.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {TEMPLATES.map(t => (
            <div 
              key={t.id} 
              style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => onSend(t.name, replacePlaceholders(t.body))}
              className="clickable-row"
            >
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{replacePlaceholders(t.body).substring(0, 60)}...</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TemplateSelector;
