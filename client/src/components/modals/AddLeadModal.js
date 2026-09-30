import React, { useEffect, useState } from 'react';
import { FiX, FiSave, FiGlobe, FiHome, FiFileText, FiMap, FiUser, FiActivity, FiRotateCcw } from 'react-icons/fi';
import './Modal.css';
import { hasConsent, loadDraft, saveDraft, clearDraft, loadDefaults, saveDefaults } from '../../utils/cookies';
import { useLeads } from '../../context/LeadContext';
import { api } from '../../services/api';

const ENQUIRY_OPTIONS = [
  { id: 'Flight', icon: <FiGlobe /> },
  { id: 'Hotel', icon: <FiHome /> },
  { id: 'Visa', icon: <FiFileText /> },
  { id: 'Package', icon: <FiMap /> },
  { id: 'Passport Assistance', icon: <FiActivity /> }
];

const SOURCE_OPTIONS = ['Website', 'Facebook Ad', 'Google Ad', 'Referral', 'Walk-in', 'Phone Call', 'WhatsApp', 'Instagram', 'Email', 'Other'];

const FORM_ID = 'lead_create';

const BUDGET_RANGES = ['<50k', '50k-1L', '1L-2L', '2L+'];
const CONTACT_CHANNELS = ['Call', 'WhatsApp', 'Email'];
const ADD_ON_OPTIONS = ['Visa', 'Passport Assistance', 'Travel Insurance', 'Forex', 'Airport Transfer'];

const blankForm = (defaults = {}, currentUser = null) => ({
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
  assigned_to: defaults.assigned_to || currentUser?.name || '',
  travel_start_date: '',
  travel_end_date: '',
  passport_expiry_date: '',
  add_on_services: [],
  budget_range: '',
  preferred_channel: '',
  next_follow_up_date: '',
  do_not_contact: false,
  enquiry_data: {},
  tags: '',
  gdpr_consent: false,
});

const AddLeadModal = ({ isOpen, onClose, onSave }) => {
  const { state, dispatch } = useLeads();
  const [activeType, setActiveType] = useState('Package');
  const [formData, setFormData] = useState(() => blankForm({}, state.currentUser));
  const [error, setError] = useState('');
  const [restoredDraft, setRestoredDraft] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowDuplicate, setAllowDuplicate] = useState(false);

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
    setAllowDuplicate(false);
    setIsSubmitting(false);
    setRestoredDraft(false);

    const draft = loadDraft(FORM_ID);
    if (draft && draft.formData) {
      setFormData({ ...blankForm({}, state.currentUser), ...draft.formData });
      if (draft.activeType) setActiveType(draft.activeType);
      setRestoredDraft(true);
    } else {
      const defaults = loadDefaults(FORM_ID);
      setFormData(blankForm(defaults, state.currentUser));
      if (defaults.activeType) setActiveType(defaults.activeType);
    }
  }, [isOpen, state.currentUser]);

  // Auto-save the draft whenever the user edits anything (only after the
  // modal is open, and only if cookies are accepted).
  useEffect(() => {
    if (!isOpen || !hasConsent()) return;
    saveDraft(FORM_ID, { activeType, formData });
  }, [isOpen, activeType, formData]);

  // Ensure users are loaded for the Assign To dropdown
  useEffect(() => {
    if (!isOpen) return;
    if ((state.users || []).length === 0) {
      api.getUsers()
        .then(u => { if (Array.isArray(u) && u.length > 0) dispatch({ type: 'SET_USERS', payload: u }); })
        .catch(() => {});
    }
  }, [isOpen, state.users, dispatch]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanMobile = (formData.mobile || '').replace(/[^0-9+]/g, '');
    if (!formData.first_name || !formData.mobile || (activeType !== 'Passport Assistance' && !formData.destination)) {
      setError(`First name, mobile, and ${activeType === 'Visa' ? 'destination country' : 'destination'} are required.`);
      return;
    }
    if (cleanMobile.replace(/[^0-9]/g, '').length < 10) {
      setError('Please enter a valid phone number (at least 10 digits).');
      return;
    }
    if (formData.travel_start_date && formData.travel_end_date && formData.travel_start_date > formData.travel_end_date) {
      setError('Travel return date cannot be before departure date.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      // Stage 1 — auto-capture UTM tags from current URL (if present)
      let utm_source, utm_medium, utm_campaign;
      try {
        const params = new URLSearchParams(window.location.search);
        utm_source = params.get('utm_source') || undefined;
        utm_medium = params.get('utm_medium') || undefined;
        utm_campaign = params.get('utm_campaign') || undefined;
      } catch (err) { /* ignore */ }

      await onSave({
        ...formData,
        destination: formData.destination || (activeType === 'Passport Assistance' ? 'Passport Assistance' : ''),
        enquiry_types: [activeType],
        allow_duplicate: allowDuplicate,
        utm_source, utm_medium, utm_campaign,
        referrer_url: typeof document !== 'undefined' ? document.referrer : undefined
      });

      // Remember stable defaults for next time, then drop the draft.
      saveDefaults(FORM_ID, {
        lead_source: formData.lead_source,
        priority:    formData.priority,
        activeType,
      });
      clearDraft(FORM_ID);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearDraft = () => {
    clearDraft(FORM_ID);
    const defaults = loadDefaults(FORM_ID);
    setFormData(blankForm(defaults));
    setActiveType(defaults.activeType || 'Package');
    setRestoredDraft(false);
  };

  const updateSubData = (field, val) => {
    const key = activeType === 'Passport Assistance' ? 'passport' : activeType.toLowerCase();
    setFormData(prev => ({
      ...prev,
      enquiry_data: {
        ...prev.enquiry_data,
        [key]: {
          ...(prev.enquiry_data?.[key] || {}),
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
        <div className="enquiry-selector" style={{ display: 'flex', gap: '10px', marginBottom: '12px', padding: '10px', background: 'var(--bg-main)', borderRadius: '10px' }}>
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

        {/* Composite Add-on Services Multi-Select */}
        <div style={{ marginBottom: '18px', padding: '10px 14px', background: 'rgba(0, 160, 227, 0.05)', borderRadius: '8px', border: '1px solid rgba(0, 160, 227, 0.2)' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            + Add-on Services for this trip (Multi-Service Composite):
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ADD_ON_OPTIONS.filter(o => o !== activeType).map(addon => {
              const isChecked = (formData.add_on_services || []).includes(addon);
              return (
                <label key={addon} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', padding: '4px 10px', borderRadius: 6, background: isChecked ? 'var(--primary)' : 'white', color: isChecked ? 'white' : 'var(--text-primary)', border: isChecked ? '1px solid var(--primary)' : '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.15s ease' }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const cur = formData.add_on_services || [];
                      setFormData({
                        ...formData,
                        add_on_services: e.target.checked ? [...cur, addon] : cur.filter(x => x !== addon)
                      });
                    }}
                    style={{ display: 'none' }}
                  />
                  {isChecked ? '✓ ' : '+ '}{addon}
                </label>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div style={{
              background: error.toLowerCase().includes('duplicate') ? '#FFFBEB' : 'var(--state-error-bg)',
              color: error.toLowerCase().includes('duplicate') ? '#92400E' : 'var(--state-error-text)',
              border: error.toLowerCase().includes('duplicate') ? '1px solid #FCD34D' : 'none',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: 15
            }}>
              <div>{error}</div>
              {error.toLowerCase().includes('duplicate') && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, cursor: 'pointer', fontWeight: 600, color: '#78350F' }}>
                  <input
                    type="checkbox"
                    checked={allowDuplicate}
                    onChange={(e) => setAllowDuplicate(e.target.checked)}
                  />
                  <span>I understand. Create a new separate inquiry for this traveler anyway.</span>
                </label>
              )}
            </div>
          )}

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
              <div className="form-group" style={{ flex: 2 }}>
                <label>{activeType === 'Visa' ? 'Destination Country*' : activeType === 'Passport Assistance' ? 'Destination (Optional)' : 'Destination*'}</label>
                <input
                  type="text"
                  placeholder={activeType === 'Visa' ? 'e.g. United Kingdom, UAE, USA, Schengen' : activeType === 'Passport Assistance' ? 'e.g. India (Optional)' : 'e.g. Dubai, Bali, Paris'}
                  value={formData.destination}
                  onChange={e => setFormData({ ...formData, destination: e.target.value })}
                />
              </div>
              <div className="form-group"><label>Lead Source</label>
                <select value={formData.lead_source} onChange={e => setFormData({ ...formData, lead_source: e.target.value })}>
                  {SOURCE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Dynamic Fields based on Type */}
            {activeType === 'Visa' && (
              <div className="dynamic-fields card" style={{ background: 'var(--bg-main)', border: '1px dashed var(--primary)', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                <div className="form-row">
                  <div className="form-group"><label>Visa Category</label>
                    <select
                      value={
                        formData.enquiry_data?.visa?.is_other_visa
                          ? 'Other'
                          : ['Tourist Visa', 'Visitor Visa', 'Business Visa', 'Student / Study Visa', 'Transit Visa', 'Work / Employment Visa'].includes(formData.enquiry_data?.visa?.visa_type)
                            ? formData.enquiry_data?.visa?.visa_type
                            : (formData.enquiry_data?.visa?.visa_type ? 'Other' : 'Tourist Visa')
                      }
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'Other') {
                          updateSubData('is_other_visa', true);
                          updateSubData('visa_type', formData.enquiry_data?.visa?.custom_visa_type || 'Other');
                        } else {
                          updateSubData('is_other_visa', false);
                          updateSubData('visa_type', val);
                        }
                      }}
                    >
                      <option value="Tourist Visa">Tourist Visa</option>
                      <option value="Visitor Visa">Visitor Visa</option>
                      <option value="Business Visa">Business Visa</option>
                      <option value="Student / Study Visa">Student / Study Visa</option>
                      <option value="Transit Visa">Transit Visa</option>
                      <option value="Work / Employment Visa">Work / Employment Visa</option>
                      <option value="Other">Other (Specify Custom)</option>
                    </select>
                  </div>
                  {(formData.enquiry_data?.visa?.is_other_visa || (!['Tourist Visa', 'Visitor Visa', 'Business Visa', 'Student / Study Visa', 'Transit Visa', 'Work / Employment Visa'].includes(formData.enquiry_data?.visa?.visa_type) && formData.enquiry_data?.visa?.visa_type)) && (
                    <div className="form-group" style={{ flex: '1 1 200px' }}>
                      <label>Specify Custom Visa Type *</label>
                      <input
                        type="text"
                        placeholder="e.g. Spouse Visa, Medical Visa, Working Holiday"
                        value={formData.enquiry_data?.visa?.custom_visa_type || (formData.enquiry_data?.visa?.visa_type !== 'Other' ? formData.enquiry_data?.visa?.visa_type : '')}
                        onChange={e => {
                          const customVal = e.target.value;
                          updateSubData('custom_visa_type', customVal);
                          updateSubData('visa_type', customVal || 'Other');
                        }}
                        autoFocus
                      />
                    </div>
                  )}
                  <div className="form-group"><label>Entry Type</label>
                    <select value={formData.enquiry_data?.visa?.entry_type || 'Single Entry'} onChange={e => updateSubData('entry_type', e.target.value)}>
                      <option>Single Entry</option>
                      <option>Multiple Entry</option>
                      <option>Double Entry</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Processing Priority</label>
                    <select value={formData.enquiry_data?.visa?.processing_speed || 'Standard'} onChange={e => updateSubData('processing_speed', e.target.value)}>
                      <option>Standard</option>
                      <option>Express / Urgent</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
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

            {activeType === 'Passport Assistance' && (
              <div className="dynamic-fields card" style={{ background: 'var(--bg-main)', border: '1px dashed var(--primary)', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                <div className="form-row">
                  <div className="form-group"><label>Passport Service*</label>
                    <select value={formData.enquiry_data?.passport?.service_type || 'Fresh Passport'} onChange={e => updateSubData('service_type', e.target.value)}>
                      <option>Fresh Passport</option>
                      <option>Passport Renewal / Re-issue</option>
                      <option>Tatkaal Passport</option>
                      <option>PCC (Police Clearance Certificate)</option>
                      <option>ECR / Non-ECR Change</option>
                      <option>Damaged / Lost Passport</option>
                    </select>
                  </div>
                  <div className="form-group"><label>RPO Office / City</label>
                    <input type="text" placeholder="e.g. Ahmedabad, Surat, Mumbai" value={formData.enquiry_data?.passport?.rpo_location || ''} onChange={e => updateSubData('rpo_location', e.target.value)} />
                  </div>
                </div>
                <div className="form-row" style={{ marginTop: 8 }}>
                  <div className="form-group"><label>Existing Passport No (If Renewal)</label>
                    <input type="text" placeholder="e.g. N1234567" value={formData.enquiry_data?.passport?.existing_passport_no || ''} onChange={e => updateSubData('existing_passport_no', e.target.value)} />
                  </div>
                  <div className="form-group"><label>Current Passport Expiry</label>
                    <input type="date" value={formData.passport_expiry_date || ''} onChange={e => setFormData({ ...formData, passport_expiry_date: e.target.value })} />
                  </div>
                  <div className="form-group"><label>Target Appointment Date</label>
                    <input type="date" value={formData.enquiry_data?.passport?.appointment_date || ''} onChange={e => updateSubData('appointment_date', e.target.value)} />
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
              <div className="form-group"><label>Passport Expiry</label><input type="date" title="Required for 6-month international validity check" value={formData.passport_expiry_date || ''} onChange={e => setFormData({ ...formData, passport_expiry_date: e.target.value })} /></div>
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
              <div className="form-group">
                <label>Assign To</label>
                <select value={formData.assigned_to} onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}>
                  <option value="">— Unassigned —</option>
                  {Array.from(new Set(
                    (state.users || []).filter(u => !u.status || u.status === 'Active').map(u => u.name)
                  )).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
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
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                <FiSave /> {isSubmitting ? 'Creating...' : allowDuplicate ? `Confirm Duplicate ${activeType} Lead` : `Create ${activeType} Lead`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLeadModal;
