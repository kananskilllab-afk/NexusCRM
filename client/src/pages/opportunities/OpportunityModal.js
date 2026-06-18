import React, { useEffect, useState } from 'react';
import { FiX, FiSave, FiTrash2, FiUser, FiMapPin, FiDollarSign, FiPlus, FiTag, FiUsers } from 'react-icons/fi';
import { useLeads, ROLE_HIERARCHY } from '../../context/LeadContext';
import '../../components/modals/Modal.css';

// §5.1 seven-stage pipeline.
const STAGES = ['Qualification', 'Itinerary', 'Quote Sent', 'Negotiation', 'Verbal Confirm', 'Closed-Won', 'Closed-Lost'];
// §5.3 line-item segment types.
const SEGMENT_TYPES = ['Package', 'Flight', 'Hotel', 'Activity', 'Transfer', 'Tour', 'Visa', 'Insurance', 'Other'];
const OPP_TYPES = ['Package', 'Flight', 'Hotel', 'Visa'];
const COMPETITORS = ['None', 'Other agency', 'OTA', 'DIY'];

const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

const blankLineItem = () => ({ name: '', service_type: 'Package', quantity: 1, unit_cost: '', unit_price: '' });

const blankForm = () => ({
  name: '',
  customer_name: '',
  opp_type: 'Package',
  destination: '',
  estimated_value: '',
  priority: 'Normal',
  stage: 'Qualification',
  expected_close_date: '',
  travel_start: '',
  travel_end: '',
  travellers: '',
  owner: '',
  competitor: 'None',
  next_step: '',
  email: '',
  mobile: '',
  notes: '',
  line_items: [],
});

// Sum of qty × sell price across line items (rupees).
const lineItemsTotal = (items) =>
  items.reduce((sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0), 0);

/**
 * Create / edit an opportunity. Pass `opp` to edit; omit to create.
 * Pass `customer` to lock the deal to an existing customer account.
 */
const OpportunityModal = ({ isOpen, mode, opp, customer, onClose, onSave, onDelete }) => {
  const { state } = useLeads();
  // §9 — cost/margin visible only to managers and above (level ≥ 3).
  const canSeeCost = (ROLE_HIERARCHY[state.currentUser?.role] || 0) >= 3;

  const [form, setForm] = useState(blankForm());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (mode === 'edit' && opp) {
      setForm({
        name: opp.name || '',
        customer_name: opp.customer_name || '',
        opp_type: opp.opp_type || 'Package',
        destination: opp.destination || '',
        estimated_value: opp.estimated_value ? String(opp.estimated_value) : '',
        priority: opp.priority || 'Normal',
        stage: opp.stage || 'Qualification',
        expected_close_date: toDateInput(opp.expected_close_date),
        travel_start: toDateInput(opp.travel_start),
        travel_end: toDateInput(opp.travel_end),
        travellers: opp.travellers ? String(opp.travellers) : '',
        owner: opp.owner || '',
        competitor: opp.competitor || 'None',
        next_step: opp.next_step || '',
        email: opp.email || '',
        mobile: opp.mobile || '',
        notes: opp.notes || '',
        line_items: (opp.line_items || []).map((li) => ({
          name: li.name || '',
          service_type: li.service_type || 'Package',
          quantity: li.quantity ?? 1,
          unit_cost: li.unit_cost ?? '',
          unit_price: li.unit_price ?? '',
        })),
      });
    } else {
      const base = blankForm();
      if (customer) {
        base.customer_name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
        base.email = customer.email || '';
        base.mobile = customer.mobile || customer.phone || '';
      }
      setForm(base);
    }
  }, [isOpen, mode, opp, customer]);

  if (!isOpen) return null;

  const hasLineItems = form.line_items.length > 0;
  const derivedValue = lineItemsTotal(form.line_items);
  const lockCustomer = !!customer && mode !== 'edit';

  const updateLineItem = (idx, patch) => {
    setForm((f) => ({
      ...f,
      line_items: f.line_items.map((li, i) => (i === idx ? { ...li, ...patch } : li)),
    }));
  };
  const addLineItem = () => setForm((f) => ({ ...f, line_items: [...f.line_items, blankLineItem()] }));
  const removeLineItem = (idx) =>
    setForm((f) => ({ ...f, line_items: f.line_items.filter((_, i) => i !== idx) }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim()) { setError('Customer name is required.'); return; }
    setError('');
    setSaving(true);

    const line_items = form.line_items
      .filter((li) => li.name.trim())
      .map((li) => ({
        name: li.name.trim(),
        service_type: li.service_type,
        quantity: Number(li.quantity) || 0,
        unit_cost: Number(li.unit_cost) || 0,
        unit_price: Number(li.unit_price) || 0,
      }));

    const payload = {
      name: form.name.trim() || undefined,
      opp_type: form.opp_type,
      destination: form.destination.trim(),
      priority: form.priority,
      expected_close_date: form.expected_close_date || null,
      travel_start: form.travel_start || null,
      travel_end: form.travel_end || null,
      travellers: Number(form.travellers) || 0,
      owner: form.owner.trim() || undefined,
      competitor: form.competitor,
      next_step: form.next_step.trim(),
      notes: form.notes,
      line_items,
      estimated_value: line_items.length > 0 ? derivedValue : (parseFloat(form.estimated_value) || 0),
    };
    if (!lockCustomer) {
      payload.customer_name = form.customer_name.trim();
      payload.email = form.email.trim();
      payload.mobile = form.mobile.trim();
    }
    if (mode !== 'edit') payload.stage = form.stage;

    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content card" style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <h2>{mode === 'edit' ? `Edit Opportunity ${opp?.opp_code || ''}` : 'New Opportunity'}</h2>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>

        <form onSubmit={submit} className="modal-form">
          {error && (
            <div style={{ background: 'var(--state-error-bg)', color: 'var(--state-error-text)', padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label><FiTag style={{ marginRight: 6 }} />Opportunity Name</label>
            <input type="text" placeholder="e.g. Sharma — Bali Honeymoon — Dec 2026" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="form-row" style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 2 }}>
              <label><FiUser style={{ marginRight: 6 }} />Customer Name *</label>
              <input type="text" required placeholder="e.g. Rahul Sharma" value={form.customer_name}
                disabled={lockCustomer}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Type</label>
              <select value={form.opp_type} onChange={(e) => setForm({ ...form, opp_type: e.target.value })}>
                {OPP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label><FiMapPin style={{ marginRight: 6 }} />Destination</label>
            <input type="text" placeholder="e.g. Bali" value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })} />
          </div>

          {/* ── Line items: packages / services on this deal (§5.3) ── */}
          <div className="form-group">
            <label><FiDollarSign style={{ marginRight: 6 }} />Packages / Services</label>
            {form.line_items.map((li, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input type="text" placeholder="Package / service name" value={li.name} style={{ flex: 2 }}
                  onChange={(e) => updateLineItem(idx, { name: e.target.value })} />
                <select value={li.service_type} style={{ flex: 1 }}
                  onChange={(e) => updateLineItem(idx, { service_type: e.target.value })}>
                  {SEGMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="number" min="0" step="1" placeholder="Qty" value={li.quantity} style={{ width: 56 }}
                  onChange={(e) => updateLineItem(idx, { quantity: e.target.value })} />
                {canSeeCost && (
                  <input type="number" min="0" step="1" placeholder="Cost ₹" value={li.unit_cost} style={{ width: 88 }}
                    title="Supplier cost (restricted)"
                    onChange={(e) => updateLineItem(idx, { unit_cost: e.target.value })} />
                )}
                <input type="number" min="0" step="1" placeholder="Sell ₹" value={li.unit_price} style={{ width: 88 }}
                  onChange={(e) => updateLineItem(idx, { unit_price: e.target.value })} />
                <button type="button" className="btn-icon text-danger" onClick={() => removeLineItem(idx)}>
                  <FiTrash2 />
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-sm" onClick={addLineItem}>
              <FiPlus /> Add line item
            </button>
          </div>

          <div className="form-row" style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label><FiDollarSign style={{ marginRight: 6 }} />Amount (₹)</label>
              <input type="number" min="0" step="1" placeholder="0"
                value={hasLineItems ? derivedValue : form.estimated_value}
                disabled={hasLineItems}
                title={hasLineItems ? 'Calculated from line items' : undefined}
                onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option>Hot</option><option>Normal</option><option>Cold</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label><FiUsers style={{ marginRight: 6 }} />Travellers</label>
              <input type="number" min="0" step="1" placeholder="0" value={form.travellers}
                onChange={(e) => setForm({ ...form, travellers: e.target.value })} />
            </div>
          </div>

          <div className="form-row" style={{ display: 'flex', gap: 12 }}>
            {mode !== 'edit' && (
              <div className="form-group" style={{ flex: 1 }}>
                <label>Stage</label>
                <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div className="form-group" style={{ flex: 1 }}>
              <label>Expected Close</label>
              <input type="date" value={form.expected_close_date}
                onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Owner</label>
              <input type="text" placeholder="Agent name" value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })} />
            </div>
          </div>

          <div className="form-row" style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Travel Start</label>
              <input type="date" value={form.travel_start}
                onChange={(e) => setForm({ ...form, travel_start: e.target.value })} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Travel End</label>
              <input type="date" value={form.travel_end}
                onChange={(e) => setForm({ ...form, travel_end: e.target.value })} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Competitor</label>
              <select value={form.competitor} onChange={(e) => setForm({ ...form, competitor: e.target.value })}>
                {COMPETITORS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Next Step</label>
            <input type="text" placeholder="The single next action" value={form.next_step}
              onChange={(e) => setForm({ ...form, next_step: e.target.value })} />
          </div>

          <div className="form-row" style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Email</label>
              <input type="email" value={form.email} disabled={lockCustomer}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Mobile</label>
              <input type="tel" value={form.mobile} disabled={lockCustomer}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            {mode === 'edit' && onDelete ? (
              <button type="button" className="btn btn-outline" style={{ color: 'var(--color-red)', borderColor: 'var(--color-red)' }}
                onClick={() => onDelete(opp)}>
                <FiTrash2 /> Delete
              </button>
            ) : <span />}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <FiSave /> {saving ? 'Saving…' : (mode === 'edit' ? 'Save Changes' : 'Create Opportunity')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OpportunityModal;
