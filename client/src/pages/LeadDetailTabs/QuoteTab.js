import React, { useState } from 'react';
import { FiMail, FiMessageCircle, FiTarget, FiAlertCircle, FiCheck } from 'react-icons/fi';
import { api } from '../../services/api';

const money = (v = 0) => `₹${Math.round(v || 0).toLocaleString('en-IN')}`;

const STAGE_ORDER = ['Qualification', 'Itinerary', 'Quote Sent', 'Negotiation', 'Verbal Confirm', 'Closed-Won', 'Closed-Lost'];

const QuoteTab = ({ lead, opp, onQuoteSent }) => {
  const [sending, setSending] = useState(null); // 'Email' | 'WhatsApp' | null

  const hasOpp = !!opp;
  const hasLineItems = hasOpp && Array.isArray(opp.line_items) && opp.line_items.length > 0;
  const alreadySent = hasOpp && STAGE_ORDER.indexOf(opp.stage) >= STAGE_ORDER.indexOf('Quote Sent');

  const lineItems = hasLineItems ? opp.line_items : [];
  const subtotal = lineItems.reduce((sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0), 0);

  const sendQuote = async (method) => {
    if (!opp?.id) return;
    setSending(method);
    try {
      if (!alreadySent) {
        await api.moveOpportunityStage(opp.id, 'Quote Sent');
      }
      if (onQuoteSent) onQuoteSent();
      alert(`Quotation sent via ${method}${!alreadySent ? ' — opportunity moved to Quote Sent.' : '.'}`);
    } catch (err) {
      alert(err.message || `Failed to send via ${method}`);
    } finally {
      setSending(null);
    }
  };

  // ── No opportunity linked yet ──────────────────────────────────────────────
  if (!hasOpp) {
    return (
      <div className="tab-content">
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <FiTarget size={40} style={{ marginBottom: '1rem', color: 'var(--kanan-sky)' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>No linked opportunity</h3>
          <p style={{ fontSize: '0.9rem' }}>Convert this lead to an opportunity first, then add packages in the Itinerary stage to generate a quotation.</p>
        </div>
      </div>
    );
  }

  // ── Opportunity exists but no packages added yet ───────────────────────────
  if (!hasLineItems) {
    return (
      <div className="tab-content">
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <FiAlertCircle size={40} style={{ marginBottom: '1rem', color: 'var(--kanan-orange)' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Quotation not ready</h3>
          <p style={{ fontSize: '0.9rem' }}>
            The linked opportunity <strong>{opp.opp_code}</strong> is in <strong>{opp.stage}</strong> stage.<br />
            Move it to <strong>Itinerary</strong> and add at least one Package / Service with an amount to generate the quotation here.
          </p>
        </div>
      </div>
    );
  }

  // ── Full quotation preview ─────────────────────────────────────────────────
  return (
    <div className="tab-content">

      {/* Stage banner */}
      <div className="card" style={{
        marginBottom: '1rem',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderLeft: `4px solid ${alreadySent ? 'var(--kanan-green)' : 'var(--kanan-sky)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {alreadySent
            ? <FiCheck size={16} style={{ color: 'var(--kanan-green)' }} />
            : <FiTarget size={16} style={{ color: 'var(--kanan-sky)' }} />
          }
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Opportunity · {opp.opp_code}</div>
            <div style={{ fontWeight: 600 }}>{opp.name || opp.destination || 'Opportunity'} — Stage: <span style={{ color: alreadySent ? 'var(--kanan-green)' : 'var(--kanan-sky)' }}>{opp.stage}</span></div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary btn-sm"
            disabled={!!sending}
            onClick={() => sendQuote('Email')}
            style={{ opacity: sending && sending !== 'Email' ? 0.5 : 1 }}
          >
            <FiMail /> {sending === 'Email' ? 'Sending…' : 'Email Quote'}
          </button>
          <button
            className="btn btn-outline btn-sm"
            disabled={!!sending}
            onClick={() => sendQuote('WhatsApp')}
            style={{ opacity: sending && sending !== 'WhatsApp' ? 0.5 : 1 }}
          >
            <FiMessageCircle /> {sending === 'WhatsApp' ? 'Sending…' : 'WhatsApp'}
          </button>
        </div>
      </div>

      {/* Quote document */}
      <div className="card" style={{ padding: '40px', background: 'white', color: '#333' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--kanan-navy)', paddingBottom: '20px', marginBottom: '30px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
              <img src="/logo.png" alt="Logo" style={{ height: '35px' }} onError={(e) => { e.target.style.display = 'none'; }} />
              <h2 style={{ color: 'var(--kanan-navy)', margin: 0 }}>Kanan International Pvt Ltd</h2>
            </div>
            <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Vadodara, Gujarat<br />hello@kanan.co</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ color: 'var(--kanan-navy)', marginBottom: 4 }}>QUOTATION</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Ref: {opp.opp_code || lead.lead_code}</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Date: {new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>

        {/* Bill to / Trip details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Bill To</p>
            <p style={{ fontWeight: 600, margin: 0 }}>{lead.first_name} {lead.last_name || ''}</p>
            <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>{opp.email || lead.email}</p>
            <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>{opp.mobile || lead.mobile}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Trip Details</p>
            <p style={{ fontWeight: 600, margin: 0 }}>{opp.destination || lead.destination}</p>
            {(opp.travel_start || opp.travel_end) && (
              <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>
                Travel: {opp.travel_start ? new Date(opp.travel_start).toLocaleDateString('en-IN') : '—'} to {opp.travel_end ? new Date(opp.travel_end).toLocaleDateString('en-IN') : '—'}
              </p>
            )}
            {opp.travellers > 0 && (
              <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>Pax: {opp.travellers}</p>
            )}
          </div>
        </div>

        {/* Line items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
          <thead>
            <tr style={{ background: 'var(--kanan-paper)', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--kanan-ink)' }}>Package / Service</th>
              <th style={{ padding: '10px 12px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--kanan-ink)' }}>Type</th>
              <th style={{ padding: '10px 12px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--kanan-ink)', textAlign: 'center' }}>Qty</th>
              <th style={{ padding: '10px 12px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--kanan-ink)', textAlign: 'right' }}>Rate (₹)</th>
              <th style={{ padding: '10px 12px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--kanan-ink)', textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((li, idx) => {
              const amount = (Number(li.quantity) || 0) * (Number(li.unit_price) || 0);
              return (
                <tr key={idx} style={{ borderBottom: '1px solid var(--kanan-line)' }}>
                  <td style={{ padding: '10px 12px', fontSize: '0.9rem' }}>{li.name}</td>
                  <td style={{ padding: '10px 12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{li.service_type}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{li.quantity}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{money(li.unit_price)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{money(amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '260px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '1.1rem', fontWeight: 700, borderTop: '2px solid var(--kanan-navy)', marginTop: 4 }}>
              <span>Total</span>
              <span style={{ color: 'var(--kanan-green)' }}>{money(subtotal)}</span>
            </div>
          </div>
        </div>

        {opp.notes && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--kanan-paper)', borderRadius: 8, fontSize: '0.85rem', color: '#555' }}>
            <strong>Notes:</strong> {opp.notes}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteTab;
