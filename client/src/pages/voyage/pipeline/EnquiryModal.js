import React, { useEffect, useState } from 'react';
import { FiX, FiSave, FiTrash2, FiMapPin, FiUser, FiDollarSign } from 'react-icons/fi';
import '../../../components/modals/Modal.css';

// Convert a rupee amount (string/number) to integer paise (cents).
const toCents = (val) => Math.round((parseFloat(val) || 0) * 100);
// Convert paise back to a rupee value for the form input.
const toUnits = (cents) => (cents ? (cents / 100).toString() : '');
// Format an ISO date to yyyy-mm-dd for <input type=date>.
const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

const blankForm = () => ({
  contact_name: '',
  destination: '',
  sell: '',
  cost: '',
  priority: 'medium',
  expected_close_date: '',
  start_at: '',
  end_at: '',
  stage_id: '',
});

/**
 * Create / edit a pipeline enquiry (booking).
 * Pass `booking` to edit; omit it to create. `stages` drives the stage picker.
 */
const EnquiryModal = ({ isOpen, mode, booking, stages = [], onClose, onSave, onDelete }) => {
  const [form, setForm] = useState(blankForm());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (mode === 'edit' && booking) {
      setForm({
        contact_name: booking.contact_name || '',
        destination: booking.destination || '',
        sell: toUnits(booking.total_sell_cents),
        cost: toUnits(booking.total_cost_cents),
        priority: booking.priority || 'medium',
        expected_close_date: toDateInput(booking.expected_close_date),
        start_at: toDateInput(booking.travel_dates && booking.travel_dates.start),
        end_at: toDateInput(booking.travel_dates && booking.travel_dates.end),
        stage_id: booking.stage_id || '',
      });
    } else {
      setForm({ ...blankForm(), stage_id: stages[0] ? stages[0].id : '' });
    }
  }, [isOpen, mode, booking, stages]);

  if (!isOpen) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.destination.trim()) { setError('Destination is required.'); return; }
    if (form.start_at && form.end_at && form.end_at < form.start_at) {
      setError('Travel end date cannot be before the start date.'); return;
    }
    setError('');
    setSaving(true);

    const payload = {
      contact_name: form.contact_name.trim(),
      destination: form.destination.trim(),
      total_sell_cents: toCents(form.sell),
      total_cost_cents: toCents(form.cost),
      priority: form.priority,
      expected_close_date: form.expected_close_date || null,
      start_at: form.start_at || null,
      end_at: form.end_at || null,
    };
    if (mode !== 'edit') payload.stage_id = form.stage_id;

    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const margin = (() => {
    const sell = parseFloat(form.sell) || 0;
    const cost = parseFloat(form.cost) || 0;
    if (sell <= 0) return null;
    return Math.round(((sell - cost) / sell) * 100);
  })();

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content card" style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <h2>{mode === 'edit' ? 'Edit Deal' : 'New Enquiry'}</h2>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>

        <form onSubmit={submit} className="modal-form">
          {error && (
            <div style={{ background: 'var(--state-error-bg)', color: 'var(--state-error-text)', padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label><FiUser style={{ marginRight: 6 }} />Client Name</label>
            <input type="text" placeholder="e.g. Rahul Sharma" value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
          </div>

          <div className="form-group">
            <label><FiMapPin style={{ marginRight: 6 }} />Destination *</label>
            <input type="text" required placeholder="e.g. Bali Honeymoon Package" value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })} />
          </div>

          <div className="form-row" style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label><FiDollarSign style={{ marginRight: 6 }} />Sell Value (₹)</label>
              <input type="number" min="0" step="0.01" placeholder="0" value={form.sell}
                onChange={(e) => setForm({ ...form, sell: e.target.value })} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Cost (₹)</label>
              <input type="number" min="0" step="0.01" placeholder="0" value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </div>
          </div>

          {margin !== null && (
            <div style={{ fontSize: '0.78rem', color: margin >= 0 ? 'var(--color-green)' : 'var(--color-red)', marginTop: -6, fontWeight: 600 }}>
              Margin: {margin}%
            </div>
          )}

          <div className="form-row" style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            {mode !== 'edit' && (
              <div className="form-group" style={{ flex: 1 }}>
                <label>Stage</label>
                <select value={form.stage_id} onChange={(e) => setForm({ ...form, stage_id: e.target.value })}>
                  {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group" style={{ flex: 1 }}>
              <label>Expected Close</label>
              <input type="date" value={form.expected_close_date}
                onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} />
            </div>
          </div>

          <div className="form-row" style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Travel Start</label>
              <input type="date" value={form.start_at}
                onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Travel End</label>
              <input type="date" value={form.end_at}
                onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
            </div>
          </div>

          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            {mode === 'edit' && onDelete ? (
              <button type="button" className="btn btn-outline" style={{ color: 'var(--color-red)', borderColor: 'var(--color-red)' }}
                onClick={() => onDelete(booking)}>
                <FiTrash2 /> Delete
              </button>
            ) : <span />}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <FiSave /> {saving ? 'Saving…' : (mode === 'edit' ? 'Save Changes' : 'Create Enquiry')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnquiryModal;
