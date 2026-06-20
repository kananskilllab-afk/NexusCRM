import React, { useEffect, useState } from 'react';
import { FiX, FiSave } from 'react-icons/fi';
import '../../../components/modals/Modal.css';
import './PipelineBoard.css';

const PALETTE = ['#284695', '#00A0E3', '#009846', '#B0CB1F', '#E19D19', '#EF7F1A', '#9C2BE3', '#E53935', '#6b7280'];

const blankForm = () => ({
  name: '',
  color: '#284695',
  probability: 50,
  wip_limit: 0,
  is_closed_won: false,
  is_closed_lost: false,
});

/**
 * Create / edit a pipeline stage. Pass `stage` to edit; omit to create.
 */
const StageModal = ({ isOpen, mode, stage, onClose, onSave }) => {
  const [form, setForm] = useState(blankForm());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (mode === 'edit' && stage) {
      setForm({
        name: stage.name || '',
        color: stage.color || '#284695',
        probability: stage.probability ?? 50,
        wip_limit: stage.wip_limit || 0,
        is_closed_won: !!stage.is_closed_won,
        is_closed_lost: !!stage.is_closed_lost,
      });
    } else {
      setForm(blankForm());
    }
  }, [isOpen, mode, stage]);

  if (!isOpen) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Stage name is required.'); return; }
    setError('');
    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        color: form.color,
        probability: parseInt(form.probability, 10) || 0,
        wip_limit: parseInt(form.wip_limit, 10) || 0,
        // Won and Lost are mutually exclusive.
        is_closed_won: form.is_closed_won && !form.is_closed_lost,
        is_closed_lost: form.is_closed_lost,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key) => setForm((f) => {
    if (key === 'is_closed_won') return { ...f, is_closed_won: !f.is_closed_won, is_closed_lost: false };
    if (key === 'is_closed_lost') return { ...f, is_closed_lost: !f.is_closed_lost, is_closed_won: false };
    return f;
  });

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content card" style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <h2>{mode === 'edit' ? 'Edit Stage' : 'New Stage'}</h2>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>

        <form onSubmit={submit} className="modal-form">
          {error && (
            <div style={{ background: 'var(--state-error-bg)', color: 'var(--state-error-text)', padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Stage Name *</label>
            <input type="text" required placeholder="e.g. Negotiation" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="form-group">
            <label>Colour</label>
            <div className="color-swatches">
              {PALETTE.map((c) => (
                <div key={c}
                  className={`color-swatch ${form.color === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setForm({ ...form, color: c })} />
              ))}
            </div>
          </div>

          <div className="form-row" style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Win Probability (%)</label>
              <input type="number" min="0" max="100" value={form.probability}
                onChange={(e) => setForm({ ...form, probability: e.target.value })} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>WIP Limit (0 = none)</label>
              <input type="number" min="0" value={form.wip_limit}
                onChange={(e) => setForm({ ...form, wip_limit: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 18, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_closed_won} onChange={() => toggle('is_closed_won')} />
              Won stage
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_closed_lost} onChange={() => toggle('is_closed_lost')} />
              Lost stage
            </label>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
            Deals moved into a Won/Lost stage automatically update their status and drop out of the open forecast.
          </p>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <FiSave /> {saving ? 'Saving…' : (mode === 'edit' ? 'Save Stage' : 'Create Stage')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StageModal;
