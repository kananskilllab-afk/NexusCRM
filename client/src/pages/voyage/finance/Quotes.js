import React, { useState, useEffect } from 'react';
import { FiPlus, FiDownload, FiSend, FiEye, FiX, FiTrash2 } from 'react-icons/fi';
import { voyageApi } from '../../../services/voyageApi';
import { api } from '../../../services/api';

const Quotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create-quote form state
  const [form, setForm] = useState({
    lead_id: '',
    discount_pct: 0,
    currency: 'INR',
    valid_until: '',
    terms: '',
    items: [{ desc: '', qty: 1, cost: 0, sell: 0 }],
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [q, l] = await Promise.all([
          voyageApi.getQuotes().catch(() => []),
          api.getLeads().catch(() => []),
        ]);
        setQuotes(q);
        setLeads(l);
      } catch (_) {}
      setLoading(false);
    };
    load();
  }, []);

  const addLineItem = () => {
    setForm(f => ({ ...f, items: [...f.items, { desc: '', qty: 1, cost: 0, sell: 0 }] }));
  };

  const removeLineItem = (idx) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const updateLineItem = (idx, field, value) => {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item),
    }));
  };

  const handleCreate = async () => {
    if (!form.lead_id) return alert('Please select a Lead / Opportunity.');
    if (form.items.length === 0 || !form.items[0].desc) return alert('Add at least one line item with a description.');
    setSaving(true);
    try {
      await api.createQuote({
        lead_id: form.lead_id,
        items: form.items.map(i => ({
          desc: i.desc,
          qty: Number(i.qty) || 1,
          cost: Number(i.cost) || 0,
          sell: Number(i.sell) || 0,
        })),
        discount_pct: Number(form.discount_pct) || 0,
        currency: form.currency,
        valid_until: form.valid_until || undefined,
        terms: form.terms || undefined,
      });
      // Refresh quotes list
      const updated = await voyageApi.getQuotes().catch(() => []);
      setQuotes(updated);
      setShowCreate(false);
      setForm({ lead_id: '', discount_pct: 0, currency: 'INR', valid_until: '', terms: '', items: [{ desc: '', qty: 1, cost: 0, sell: 0 }] });
    } catch (err) {
      alert(err.message || 'Failed to create quote');
    } finally {
      setSaving(false);
    }
  };

  const sellTotal = form.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.sell) || 0), 0);
  const discountAmt = +((sellTotal * (Number(form.discount_pct) || 0)) / 100).toFixed(2);
  const finalTotal = +(sellTotal - discountAmt).toFixed(2);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Quotes</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>Manage and send pricing proposals to clients.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><FiPlus /> Create Quote</button>
      </div>

      {/* ── Create Quote Form ──────────────────────────────────────── */}
      {showCreate && (
        <div className="card" style={{ padding: '24px', marginBottom: '20px', border: '2px dashed var(--kanan-green, #009846)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>New Quotation</h3>
            <button className="btn-icon" onClick={() => setShowCreate(false)}><FiX /></button>
          </div>

          {/* Meta fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Lead / Opportunity *</label>
              <select value={form.lead_id} onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))}
                style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #ccc' }}>
                <option value="">— Select —</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.first_name} {l.last_name} — {l.destination || 'N/A'} ({l.lead_code || l.id})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Currency</label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #ccc' }}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Valid Until</label>
              <input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
                style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #ccc' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Discount %</label>
              <input type="number" min="0" max="100" value={form.discount_pct}
                onChange={e => setForm(f => ({ ...f, discount_pct: e.target.value }))}
                style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #ccc' }} />
            </div>
          </div>

          {/* Line items */}
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Line Items</label>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
            <thead>
              <tr style={{ textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <th style={{ padding: '6px 8px' }}>Description</th>
                <th style={{ padding: '6px 8px', width: 70 }}>Qty</th>
                <th style={{ padding: '6px 8px', width: 110 }}>Cost (₹)</th>
                <th style={{ padding: '6px 8px', width: 110 }}>Sell (₹)</th>
                <th style={{ padding: '6px 8px', width: 110, textAlign: 'right' }}>Amount</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, idx) => {
                const amt = (Number(item.qty) || 0) * (Number(item.sell) || 0);
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '4px 8px' }}>
                      <input type="text" placeholder="e.g. Hotel Stay" value={item.desc}
                        onChange={e => updateLineItem(idx, 'desc', e.target.value)}
                        style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: 4 }} />
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <input type="number" min="1" value={item.qty}
                        onChange={e => updateLineItem(idx, 'qty', e.target.value)}
                        style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: 4 }} />
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <input type="number" min="0" value={item.cost}
                        onChange={e => updateLineItem(idx, 'cost', e.target.value)}
                        style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: 4 }} />
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <input type="number" min="0" value={item.sell}
                        onChange={e => updateLineItem(idx, 'sell', e.target.value)}
                        style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: 4 }} />
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>₹{amt.toLocaleString('en-IN')}</td>
                    <td>
                      {form.items.length > 1 && (
                        <button className="btn-icon text-danger" onClick={() => removeLineItem(idx)} style={{ padding: 4 }}><FiTrash2 size={14} /></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button className="btn btn-outline btn-sm" onClick={addLineItem} style={{ marginBottom: 12 }}><FiPlus /> Add Item</button>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <div style={{ width: 260 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.9rem' }}>
                <span>Subtotal</span><span>₹{sellTotal.toLocaleString('en-IN')}</span>
              </div>
              {Number(form.discount_pct) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.9rem', color: '#E53935' }}>
                  <span>Discount ({form.discount_pct}%)</span><span>-₹{discountAmt.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '1.1rem', fontWeight: 700, borderTop: '2px solid var(--kanan-navy, #284695)' }}>
                <span>Total</span><span style={{ color: 'var(--kanan-green, #009846)' }}>₹{finalTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Terms & Conditions</label>
            <textarea rows={2} placeholder="e.g. 50% advance, balance before departure..." value={form.terms}
              onChange={e => setForm(f => ({ ...f, terms: e.target.value }))}
              style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #ccc', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating…' : 'Create Quote'}
            </button>
            <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Quotes Table ──────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="leads-table">
          <thead>
            <tr>
              <th>Quote #</th>
              <th>Client</th>
              <th>Amount</th>
              <th>Date Sent</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--kanan-mute)' }}>Loading…</td></tr>
            )}
            {!loading && quotes.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--kanan-mute)' }}>No quotes found. Click "Create Quote" to generate one, or quotes are auto-created when an opportunity reaches Closed-Won.</td></tr>
            )}
            {quotes.map(q => (
              <tr key={q.id}>
                <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{q.quote_number || q.id}</td>
                <td>{q.contact_name || '—'}</td>
                <td style={{ fontWeight: 'bold' }}>₹{(q.total_amount || 0).toLocaleString('en-IN')}</td>
                <td>{q.sent_date ? new Date(q.sent_date).toLocaleDateString('en-IN') : '—'}</td>
                <td><span className={`badge badge-${q.status === 'Sent' ? 'info' : q.status === 'Approved' || q.status === 'Ready to Send' ? 'success' : 'warning'}`}>{q.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button className="btn btn-outline btn-sm"><FiEye /></button>
                    <button className="btn btn-outline btn-sm" title="Download PDF" onClick={() => alert('Downloading PDF...')}><FiDownload /></button>
                    <button className="btn btn-primary btn-sm" title="Send to Client" onClick={() => alert('Opening Email sender...')}><FiSend /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Quotes;
