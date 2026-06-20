import React, { useEffect, useState } from 'react';
import { FiX, FiTarget, FiUserCheck, FiUserPlus } from 'react-icons/fi';
import { api } from '../../services/api';
import './Modal.css';

const STAGES = ['Qualification', 'Itinerary', 'Quote Sent', 'Negotiation', 'Verbal Confirm'];
const OPP_TYPES = ['Package', 'Flight', 'Hotel', 'Visa'];

/**
 * §4.6 conversion screen: confirm the matched/new Account and set up the initial
 * Opportunity before committing. On confirm, creates Account + Contact + Opportunity.
 */
const ConversionModal = ({ isOpen, leadId, onClose, onConverted }) => {
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ name: '', opp_type: 'Package', estimated_value: '', stage: 'Qualification', expected_close_date: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !leadId) return;
    setLoading(true);
    setError('');
    api.previewConversion(leadId)
      .then((p) => {
        setPreview(p);
        setForm({
          name: p.suggested.name || '',
          opp_type: p.suggested.opp_type || 'Package',
          estimated_value: p.suggested.estimated_value ? String(p.suggested.estimated_value) : '',
          stage: p.suggested.stage || 'Qualification',
          expected_close_date: p.suggested.expected_close_date ? String(p.suggested.expected_close_date).slice(0, 10) : '',
        });
      })
      .catch((e) => setError(e.message || 'Failed to load preview'))
      .finally(() => setLoading(false));
  }, [isOpen, leadId]);

  if (!isOpen) return null;

  const commit = async () => {
    setSaving(true);
    setError('');
    try {
      const opp = await api.convertLeadToOpportunity(leadId, {
        name: form.name.trim() || undefined,
        opp_type: form.opp_type,
        estimated_value: parseFloat(form.estimated_value) || 0,
        stage: form.stage,
        expected_close_date: form.expected_close_date || undefined,
      });
      onConverted && onConverted(opp);
    } catch (e) {
      setError(e.message || 'Conversion failed');
    } finally {
      setSaving(false);
    }
  };

  const acct = preview?.account;

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content card" style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <h2><FiTarget style={{ marginRight: 8 }} />Convert Lead to Opportunity</h2>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>

        <div className="modal-form">
          {error && <div style={{ background: 'var(--state-error-bg)', color: 'var(--state-error-text)', padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem' }}>{error}</div>}

          {loading ? (
            <p style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Loading preview…</p>
          ) : preview?.already_converted ? (
            <div style={{ padding: '12px 0' }}>
              <p>This lead is already converted to an opportunity.</p>
              <button className="btn btn-primary" onClick={() => onConverted && onConverted({ id: preview.opportunity_id })}>
                View Opportunity
              </button>
            </div>
          ) : (
            <>
              {/* Account match (§4.4) */}
              <div className="card" style={{ background: 'var(--bg-main)', padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                {acct?.matched ? <FiUserCheck color="#009846" size={20} /> : <FiUserPlus color="var(--primary)" size={20} />}
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {acct?.matched ? 'Existing account matched' : 'A new account will be created'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {acct?.name || '—'}{acct?.mobile ? ` · ${acct.mobile}` : ''}{acct?.email ? ` · ${acct.email}` : ''}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Opportunity Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Type</label>
                  <select value={form.opp_type} onChange={(e) => setForm({ ...form, opp_type: e.target.value })}>
                    {OPP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Amount (₹)</label>
                  <input type="number" min="0" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} />
                </div>
              </div>

              <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Stage</label>
                  <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Expected Close</label>
                  <input type="date" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} />
                </div>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
                <button type="button" className="btn btn-primary" disabled={saving} onClick={commit}>
                  <FiTarget /> {saving ? 'Converting…' : 'Create Opportunity'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversionModal;
