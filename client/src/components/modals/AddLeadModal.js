import React, { useEffect, useState } from 'react';
import { FiX, FiSave, FiGlobe, FiHome, FiFileText, FiMap, FiUser, FiActivity, FiRotateCcw } from 'react-icons/fi';
import './Modal.css';
import { hasConsent, loadDraft, saveDraft, clearDraft, loadDefaults, saveDefaults } from '../../utils/cookies';

const ENQUIRY_OPTIONS = [
  { id: 'Flight', icon: <FiGlobe /> },
  { id: 'Hotel', icon: <FiHome /> },
  { id: 'Visa', icon: <FiFileText /> },
  { id: 'Package', icon: <FiMap /> }
];

const SOURCE_OPTIONS = ['Website', 'Facebook Ad', 'Google Ad', 'Referral', 'Walk-in', 'Phone Call', 'WhatsApp', 'Instagram', 'Email', 'Other'];

const FORM_ID = 'lead_create';

const BUDGET_RANGES = ['<50k', '50k-1L', '1L-2L', '2L+'];
const CONTACT_CHANNELS = ['Call', 'WhatsApp', 'Email'];

const blankForm = (defaults = {}) => ({
  first_name: '',
  last_name: '',
  mobile: '',
  alternate_phone: '',
  email: '',
  destination: '',
  no_adults: 1,
  no_children: 0,
  priority: defaults.priority || 'Normal',
  lead_source: defaults.lead_source || 'Website',
  assigned_to: defaults.assigned_to || 'Bhargav',
  travel_start_date: '',
  travel_end_date: '',
  budget_range: '',
  preferred_channel: '',
  next_follow_up_date: '',
  do_not_contact: false,
  enquiry_data: {},
  tags: '',
  gdpr_consent: false,
});

const AddLeadModal = ({ isOpen, onClose, onSave }) => {
  const [activeType, setActiveType] = useState('Package');
  const [formData, setFormData] = useState(() => blankForm());
  const [error, setError] = useState('');
  const [restoredDraft, setRestoredDraft] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // On open: restore an in-progress draft if one exists, otherwise seed
  // from the user's last-used defaults so common fields are pre-filled.
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setRestoredDraft(false);

    const draft = loadDraft(FORM_ID);
    if (draft && draft.formData) {
      setFormData({ ...blankForm(), ...draft.formData });
      if (draft.activeType) setActiveType(draft.activeType);
      setRestoredDraft(true);
    } else {
      const defaults = loadDefaults(FORM_ID);
      setFormData(blankForm(defaults));
      if (defaults.activeType) setActiveType(defaults.activeType);
    }
  }, [isOpen]);

  // Auto-save the draft whenever the user edits anything (only after the
  // modal is open, and only if cookies are accepted).
  useEffect(() => {
    if (!isOpen || !hasConsent()) return;
    saveDraft(FORM_ID, { activeType, formData });
  }, [isOpen, activeType, formData]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.mobile || (activeType !== 'Visa' && !formData.destination)) {
      setError('First name, mobile, and destination are required.');
      return;
    }
    setError('');

    // Remember stable defaults for next time, then drop the draft.
    saveDefaults(FORM_ID, {
      lead_source: formData.lead_source,
      assigned_to: formData.assigned_to,
      priority:    formData.priority,
      activeType,
    });
    clearDraft(FORM_ID);

    // Stage 1 — auto-capture UTM tags from current URL (if present)
    let utm_source, utm_medium, utm_campaign;
    try {
      const params = new URLSearchParams(window.location.search);
      utm_source = params.get('utm_source') || undefined;
      utm_medium = params.get('utm_medium') || undefined;
      utm_campaign = params.get('utm_campaign') || undefined;
    } catch (e) { /* ignore */ }

    onSave({
      ...formData,
      enquiry_types: [activeType],
      utm_source, utm_medium, utm_campaign,
      referrer_url: typeof document !== 'undefined' ? document.referrer : undefined
    });
    onClose();
  };

  const handleClearDraft = () => {
    clearDraft(FORM_ID);
    const defaults = loadDefaults(FORM_ID);
    setFormData(blankForm(defaults));
    setActiveType(defaults.activeType || 'Package');
    setRestoredDraft(false);
  };

  const updateSubData = (field, val) => {
    setFormData(prev => ({
      ...prev,
      enquiry_data: {
        ...prev.enquiry_data,
        [activeType.toLowerCase()]: {
          ...(prev.enquiry_data?.[activeType.toLowerCase()] || {}),
          [field]: val,
        }
      }
    }));
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal-content card"
        style={{ maxWidth: '700px' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-lead-title"
      >
        <div className="modal-header">
          <h2 id="modal-lead-title">Create New Lead</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close modal"><FiX /></button>
        </div>

        {restoredDraft && (
          <div style={{ background: 'var(--state-info-bg)', color: 'var(--state-info-text)', padding: '8px 12px', borderRadius: 8, fontSize: '0.8rem', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Restored your unsaved entries from last time.</span>
            <button type="button" onClick={handleClearDraft} style={{ background: 'transparent', border: 'none', color: 'var(--state-info-text)', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <FiRotateCcw /> Start fresh
            </button>
          </div>
        )}

        {/* Enquiry Type Selector */}
        <div className="enquiry-selector" style={{ display: 'flex', gap: '10px', marginBottom: '20px', padding: '10px', background: 'var(--bg-main)', borderRadius: '10px' }}>
          {ENQUIRY_OPTIONS.map(opt => (
            <button
              key={opt.id}
              type="button"
              className={`select-btn ${activeType === opt.id ? 'active' : ''}`}
              onClick={() => setActiveType(opt.id)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: activeType === opt.id ? 'var(--primary)' : 'white', color: activeType === opt.id ? 'white' : 'inherit' }}
            >
              {opt.icon} {opt.id}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div style={{ background: 'var(--state-error-bg)', color: 'var(--state-error-text)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: 15 }}>{error}</div>}

          <div className="form-section">
            <h4><FiUser style={{ marginRight: 8 }} /> Personal Details</h4>
            <div className="form-row">
              <div className="form-group"><label htmlFor="alm-first-name">First Name*</label><input id="alm-first-name" type="text" required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} /></div>
              <div className="form-group"><label htmlFor="alm-last-name">Last Name</label><input id="alm-last-name" type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label htmlFor="alm-mobile">Mobile*</label><input id="alm-mobile" type="tel" required value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} /></div>
              <div className="form-group"><label htmlFor="alm-alt-phone">Alternate Phone</label><input id="alm-alt-phone" type="tel" value={formData.alternate_phone} onChange={e => setFormData({ ...formData, alternate_phone: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label htmlFor="alm-email">Email</label><input id="alm-email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
              <div className="form-group"><label htmlFor="alm-channel">Preferred Channel</label>
                <select id="alm-channel" value={formData.preferred_channel} onChange={e => setFormData({ ...formData, preferred_channel: e.target.value })}>
                  <option value="">—</option>
                  {CONTACT_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section" style={{ marginTop: 20 }}>
            <h4><FiActivity style={{ marginRight: 8 }} /> Trip Specifics</h4>
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}><label>Destination*</label><input type="text" value={formData.destination} onChange={e => setFormData({ ...formData, destination: e.target.value })} /></div>
              <div className="form-group"><label>Lead Source</label>
                <select value={formData.lead_source} onChange={e => setFormData({ ...formData, lead_source: e.target.value })}>
                  {SOURCE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Dynamic Fields based on Type */}
            {activeType === 'Flight' && (
              <div className="dynamic-fields card" style={{ background: 'var(--bg-main)', border: '1px dashed var(--primary)' }}>
                <div className="form-row">
                  <div className="form-group"><label>Origin</label><input type="text" placeholder="DEL" value={formData.enquiry_data?.flight?.origin || ''} onChange={e => updateSubData('origin', e.target.value)} /></div>
                  <div className="form-group"><label>Class</label>
                    <select value={formData.enquiry_data?.flight?.class || 'Economy'} onChange={e => updateSubData('class', e.target.value)}>
                      <option>Economy</option><option>Business</option><option>First</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeType === 'Hotel' && (
              <div className="dynamic-fields card" style={{ background: 'var(--bg-main)', border: '1px dashed var(--primary)' }}>
                <div className="form-row">
                  <div className="form-group"><label>Star Rating</label>
                    <select value={formData.enquiry_data?.hotel?.stars || '3*'} onChange={e => updateSubData('stars', e.target.value)}>
                      <option>3*</option><option>4*</option><option>5*</option><option>Boutique</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Meal Plan</label>
                    <select value={formData.enquiry_data?.hotel?.mealPlan || 'CP (Breakfast)'} onChange={e => updateSubData('mealPlan', e.target.value)}>
                      <option>CP (Breakfast)</option><option>MAP (Half Board)</option><option>AP (Full Board)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="form-row" style={{ marginTop: 10 }}>
              <div className="form-group"><label>Adults*</label><input type="number" min="1" value={formData.no_adults} onChange={e => setFormData({ ...formData, no_adults: parseInt(e.target.value) || 1 })} /></div>
              <div className="form-group"><label>Children</label><input type="number" min="0" value={formData.no_children} onChange={e => setFormData({ ...formData, no_children: parseInt(e.target.value) || 0 })} /></div>
              <div className="form-group"><label>Priority</label>
                <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                  <option>Hot</option><option>Normal</option><option>Cold</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group"><label>Travel Start</label><input type="date" value={formData.travel_start_date} onChange={e => setFormData({ ...formData, travel_start_date: e.target.value })} /></div>
              <div className="form-group"><label>Travel End</label><input type="date" value={formData.travel_end_date} onChange={e => setFormData({ ...formData, travel_end_date: e.target.value })} /></div>
            </div>

            <div className="form-row" style={{ marginTop: 10 }}>
              <div className="form-group"><label>Budget Band</label>
                <select value={formData.budget_range} onChange={e => setFormData({ ...formData, budget_range: e.target.value })}>
                  <option value="">—</option>
                  {BUDGET_RANGES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Next Follow-up</label><input type="date" value={formData.next_follow_up_date} onChange={e => setFormData({ ...formData, next_follow_up_date: e.target.value })} /></div>
            </div>

            <div className="form-row" style={{ marginTop: 10 }}>
              <div className="form-group" style={{ flex: 2 }}><label>Tags (comma separated)</label><input type="text" placeholder="VIP, Honeymoon, Tech" value={formData.tags || ''} onChange={e => setFormData({ ...formData, tags: e.target.value })} /></div>
            </div>

            <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                 <input type="checkbox" checked={formData.do_not_contact} onChange={e => setFormData({ ...formData, do_not_contact: e.target.checked })} />
                 Do Not Contact (suppress automated outreach &amp; SLA chasing)
              </label>
            </div>

            <div style={{ marginTop: 15, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                 <input type="checkbox" checked={formData.gdpr_consent} onChange={e => setFormData({ ...formData, gdpr_consent: e.target.checked })} />
                 Customer has provided GDPR consent for data processing
              </label>
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: 25, justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-outline" onClick={handleClearDraft} title="Clear saved entries for this form">
              <FiRotateCcw /> Clear
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary"><FiSave /> Create {activeType} Lead</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLeadModal;
