import React from 'react';
import { useLeads } from '../../context/LeadContext';
import { FiSend, FiMail, FiMessageCircle, FiCheck, FiAlertCircle } from 'react-icons/fi';

const QuoteTab = ({ lead }) => {
  const { dispatch } = useLeads();
  const billing = lead.billing || { items: [], payments: [] };
  const items = billing.items || [];
  const enquiry = lead.enquiry_data || {};

  const subtotal = items.reduce((acc, i) => acc + (i.qty * i.price), 0);
  const totalTax = items.reduce((acc, i) => acc + (i.qty * i.price * (i.tax || 0) / 100), 0);
  const grandTotal = subtotal + totalTax;

  const sendQuote = (method) => {
    dispatch({
      type: 'LOG_COMMUNICATION',
      payload: {
        leadId: lead.id,
        comm: { type: method, template: 'Quotation', status: 'Sent', to: method === 'Email' ? lead.email : lead.mobile }
      }
    });
    dispatch({
      type: 'ADD_ACTIVITY',
      payload: { leadId: lead.id, activity: { text: `Quotation sent via ${method} to ${method === 'Email' ? lead.email : lead.mobile}`, user: 'Admin' } }
    });
    alert(`Quotation sent via ${method}!`);
  };

  return (
    <div className="tab-content">
      <div className="card">
        <div className="section-header">
          <h3>Quotation Preview</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary btn-sm" onClick={() => sendQuote('Email')}><FiMail /> Email Quote</button>
            <button className="btn btn-outline btn-sm" onClick={() => sendQuote('WhatsApp')}><FiMessageCircle /> WhatsApp</button>
          </div>
        </div>

        <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.5rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid var(--primary)' }}>
            <div>
              <h2 style={{ color: 'var(--primary)' }}>Nexus CRM</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Your Travel Partner</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3>QUOTATION</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ref: {lead.id}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>BILL TO</p>
              <p style={{ fontWeight: 600 }}>{lead.first_name} {lead.last_name}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{lead.email}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{lead.mobile}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>TRIP DETAILS</p>
              <p style={{ fontWeight: 600 }}>{lead.destination}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Travel: {lead.travel_start_date || '—'} to {lead.travel_end_date || '—'}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pax: {lead.no_adults} Adults, {lead.no_children || 0} Children</p>
            </div>
          </div>

          {Object.keys(enquiry).length > 0 && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-main)', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>SERVICE DETAILS</p>
              {enquiry.flight && <p style={{ fontSize: '0.85rem', marginBottom: 4 }}>✈ Flight: {enquiry.flight.origin} → {enquiry.flight.destination} ({enquiry.flight.class})</p>}
              {enquiry.hotel && <p style={{ fontSize: '0.85rem', marginBottom: 4 }}>🏨 Hotel: {enquiry.hotel.city} — {enquiry.hotel.stars}★ — {enquiry.hotel.mealPlan || 'Room Only'}</p>}
              {enquiry.visa && <p style={{ fontSize: '0.85rem', marginBottom: 4 }}>📋 Visa: {enquiry.visa.country} ({enquiry.visa.type})</p>}
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', textAlign: 'left' }}>
                <th style={{ padding: '10px', fontSize: '0.8rem' }}>Description</th>
                <th style={{ padding: '10px', fontSize: '0.8rem' }}>Qty</th>
                <th style={{ padding: '10px', fontSize: '0.8rem' }}>Rate</th>
                <th style={{ padding: '10px', fontSize: '0.8rem' }}>Tax</th>
                <th style={{ padding: '10px', fontSize: '0.8rem', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                  <td style={{ padding: '10px', fontSize: '0.9rem' }}>{item.description}</td>
                  <td style={{ padding: '10px' }}>{item.qty}</td>
                  <td style={{ padding: '10px' }}>₹{item.price.toLocaleString()}</td>
                  <td style={{ padding: '10px' }}>{item.tax}%</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 500 }}>₹{(item.qty * item.price * (1 + item.tax / 100)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '250px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.9rem' }}><span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}><span>Tax</span><span>₹{totalTax.toLocaleString()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '1.1rem', fontWeight: 700, borderTop: '2px solid var(--text-primary)', marginTop: '4px' }}><span>Total</span><span>₹{grandTotal.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Communication Log</h3>
        {(lead.communications || []).map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--divider)' }}>
            {c.type === 'Email' ? <FiMail color="var(--status-followup)" /> : <FiMessageCircle color="#25D366" />}
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{c.template}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>to {c.to}</span>
            </div>
            <span className={`badge ${c.status === 'Delivered' || c.status === 'Read' ? 'new' : 'working'}`}>{c.status}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(c.sentAt).toLocaleString()}</span>
          </div>
        ))}
        {(!lead.communications || lead.communications.length === 0) && <p className="text-muted">No communications sent yet.</p>}
      </div>
    </div>
  );
};

export default QuoteTab;
