import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiUser, FiInfo, FiSliders, FiShield, FiCalendar, FiRotateCcw } from 'react-icons/fi';
import './Modal.css';
import { hasConsent, loadDraft, saveDraft, clearDraft, loadDefaults, saveDefaults } from '../../utils/cookies';

const SALUTATION_OPTIONS = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'];
const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP'];
const SOURCE_OPTIONS = ['Website', 'Referral', 'Google Ad', 'Facebook Ad', 'WhatsApp', 'Instagram', 'Walk-in', 'Other'];

const FORM_ID = 'customer_create';

const blankCustomerForm = (defaults = {}) => ({
  salutation: defaults.salutation || 'Mr.',
  first_name: '',
  last_name: '',
  email: '',
  mobile: '',
  phone: '',
  city: defaults.city || '',
  address: '',
  date_of_birth: '',
  anniversary: '',
  customer_type: defaults.customer_type || 'Individual',
  source: defaults.source || 'Website',
  tags: '',
  notes: '',
  preferred_currency: defaults.preferred_currency || 'INR',
  notification_enabled: 1,
  two_factor_enabled: 0,
  gdpr_consent: false,
});

const CustomerModal = ({ isOpen, onClose, onSave, customer = null, mode = 'view' }) => {
  const [formData, setFormData] = useState(() => blankCustomerForm());
  const [activeSection, setActiveSection] = useState('personal');
  const [error, setError] = useState('');
  const [restoredDraft, setRestoredDraft] = useState(false);

  const isCreate = !customer && mode !== 'view';

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setRestoredDraft(false);

    if (customer) {
      const parsedTags = customer.tags ? (Array.isArray(customer.tags) ? customer.tags.join(', ') : customer.tags) : '';
      setFormData({
        salutation: customer.salutation || 'Mr.',
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        email: customer.email || '',
        mobile: customer.mobile || '',
        phone: customer.phone || '',
        city: customer.city || '',
        address: customer.address || '',
        date_of_birth: customer.date_of_birth || '',
        anniversary: customer.anniversary || '',
        customer_type: customer.customer_type || 'Individual',
        source: customer.source || 'Website',
        tags: parsedTags,
        notes: customer.notes || '',
        preferred_currency: customer.preferred_currency || 'INR',
        notification_enabled: customer.notification_enabled !== undefined ? customer.notification_enabled : 1,
        two_factor_enabled: customer.two_factor_enabled !== undefined ? customer.two_factor_enabled : 0,
        gdpr_consent: !!customer.gdpr_consent_at
      });
      return;
    }

    // Create mode — restore draft if present, otherwise seed last-used defaults.
    const draft = loadDraft(FORM_ID);
    if (draft) {
      setFormData({ ...blankCustomerForm(), ...draft });
      setRestoredDraft(true);
    } else {
      setFormData(blankCustomerForm(loadDefaults(FORM_ID)));
    }
  }, [customer, isOpen]);

  // Auto-save draft only when creating a new customer.
  useEffect(() => {
    if (!isOpen || !isCreate || !hasConsent()) return;
    saveDraft(FORM_ID, formData);
  }, [isOpen, isCreate, formData]);

  if (!isOpen) return null;

  const handleInputChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.first_name) {
      setError('First Name is required.');
      return;
    }
    setError('');

    const parsedTags = formData.tags
      ? formData.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
      : [];

    const payload = {
      ...formData,
      tags: parsedTags,
      gdpr_consent_at: formData.gdpr_consent ? (customer?.gdpr_consent_at || new Date().toISOString()) : null
    };

    if (isCreate) {
      saveDefaults(FORM_ID, {
        salutation:         formData.salutation,
        city:               formData.city,
        customer_type:      formData.customer_type,
        source:             formData.source,
        preferred_currency: formData.preferred_currency,
      });
      clearDraft(FORM_ID);
    }

    onSave(payload);
    onClose();
  };

  const handleClearDraft = () => {
    clearDraft(FORM_ID);
    setFormData(blankCustomerForm(loadDefaults(FORM_ID)));
    setRestoredDraft(false);
  };

  const isView = mode === 'view';

  return (
    <div className="modal-overlay">
      <div className="modal-content card" style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', height: '85vh', padding: 0 }}>
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '20px 30px', borderBottom: '1px solid var(--divider)', margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiUser size={22} style={{ color: 'var(--primary)' }} />
            <h2>{isView ? 'Customer Profile' : customer ? 'Edit Customer' : 'Create New Customer'}</h2>
          </div>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--divider)', background: 'var(--bg-main)' }}>
          <button 
            type="button" 
            onClick={() => setActiveSection('personal')} 
            style={{ flex: 1, padding: '12px', border: 'none', background: activeSection === 'personal' ? 'white' : 'transparent', borderBottom: activeSection === 'personal' ? '2px solid var(--primary)' : 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: activeSection === 'personal' ? 'var(--primary)' : 'var(--text-secondary)' }}
          >
            Personal Details
          </button>
          <button 
            type="button" 
            onClick={() => setActiveSection('preferences')} 
            style={{ flex: 1, padding: '12px', border: 'none', background: activeSection === 'preferences' ? 'white' : 'transparent', borderBottom: activeSection === 'preferences' ? '2px solid var(--primary)' : 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: activeSection === 'preferences' ? 'var(--primary)' : 'var(--text-secondary)' }}
          >
            Preferences & Details
          </button>
          <button 
            type="button" 
            onClick={() => setActiveSection('security')} 
            style={{ flex: 1, padding: '12px', border: 'none', background: activeSection === 'security' ? 'white' : 'transparent', borderBottom: activeSection === 'security' ? '2px solid var(--primary)' : 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: activeSection === 'security' ? 'var(--primary)' : 'var(--text-secondary)' }}
          >
            Security & Compliance
          </button>
        </div>

        {/* Modal Form / Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {restoredDraft && (
            <div style={{ background: '#EEF6FF', color: '#1F3A68', padding: '8px 12px', borderRadius: 8, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Restored your unsaved entries from last time.</span>
              <button type="button" onClick={handleClearDraft} style={{ background: 'transparent', border: 'none', color: '#1F3A68', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <FiRotateCcw /> Start fresh
              </button>
            </div>
          )}

          {activeSection === 'personal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Salutation</label>
                  {isView ? (
                    <div>{formData.salutation || '—'}</div>
                  ) : (
                    <select value={formData.salutation} onChange={e => handleInputChange('salutation', e.target.value)}>
                      {SALUTATION_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                    </select>
                  )}
                </div>
                <div className="form-group" style={{ flex: 3 }}>
                  <label>First Name*</label>
                  {isView ? (
                    <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{formData.first_name}</div>
                  ) : (
                    <input type="text" required value={formData.first_name} onChange={e => handleInputChange('first_name', e.target.value)} />
                  )}
                </div>
                <div className="form-group" style={{ flex: 3 }}>
                  <label>Last Name</label>
                  {isView ? (
                    <div>{formData.last_name || '—'}</div>
                  ) : (
                    <input type="text" value={formData.last_name} onChange={e => handleInputChange('last_name', e.target.value)} />
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  {isView ? (
                    <div>{formData.email || '—'}</div>
                  ) : (
                    <input type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} />
                  )}
                </div>
                <div className="form-group">
                  <label>Mobile</label>
                  {isView ? (
                    <div>{formData.mobile || '—'}</div>
                  ) : (
                    <input type="tel" value={formData.mobile} onChange={e => handleInputChange('mobile', e.target.value)} />
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Alternate Phone</label>
                  {isView ? (
                    <div>{formData.phone || '—'}</div>
                  ) : (
                    <input type="tel" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
                  )}
                </div>
                <div className="form-group">
                  <label>City</label>
                  {isView ? (
                    <div>{formData.city || '—'}</div>
                  ) : (
                    <input type="text" value={formData.city} onChange={e => handleInputChange('city', e.target.value)} />
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Address</label>
                {isView ? (
                  <div>{formData.address || '—'}</div>
                ) : (
                  <textarea rows="2" value={formData.address} onChange={e => handleInputChange('address', e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '16px', fontSize: '0.875rem', width: '100%', resize: 'none' }} />
                )}
              </div>
            </div>
          )}

          {activeSection === 'preferences' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Date of Birth</label>
                  {isView ? (
                    <div>{formData.date_of_birth || '—'}</div>
                  ) : (
                    <input type="date" value={formData.date_of_birth} onChange={e => handleInputChange('date_of_birth', e.target.value)} />
                  )}
                </div>
                <div className="form-group">
                  <label>Anniversary</label>
                  {isView ? (
                    <div>{formData.anniversary || '—'}</div>
                  ) : (
                    <input type="date" value={formData.anniversary} onChange={e => handleInputChange('anniversary', e.target.value)} />
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Customer Type</label>
                  {isView ? (
                    <div>{formData.customer_type}</div>
                  ) : (
                    <select value={formData.customer_type} onChange={e => handleInputChange('customer_type', e.target.value)}>
                      <option>Individual</option>
                      <option>Corporate</option>
                    </select>
                  )}
                </div>
                <div className="form-group">
                  <label>Preferred Currency</label>
                  {isView ? (
                    <div>{formData.preferred_currency}</div>
                  ) : (
                    <select value={formData.preferred_currency} onChange={e => handleInputChange('preferred_currency', e.target.value)}>
                      {CURRENCY_OPTIONS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Lead Source</label>
                  {isView ? (
                    <div>{formData.source}</div>
                  ) : (
                    <select value={formData.source} onChange={e => handleInputChange('source', e.target.value)}>
                      {SOURCE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  )}
                </div>
                <div className="form-group">
                  <label>Tags (Comma separated)</label>
                  {isView ? (
                    <div>
                      {formData.tags ? formData.tags.split(',').map(t => (
                        <span key={t} style={{ display: 'inline-block', fontSize: '0.75rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', marginRight: '5px', fontWeight: 500 }}>{t.trim()}</span>
                      )) : '—'}
                    </div>
                  ) : (
                    <input type="text" placeholder="e.g. VIP, Adventure, Couple" value={formData.tags} onChange={e => handleInputChange('tags', e.target.value)} />
                  )}
                </div>
              </div>

              {isView && customer && (
                <div style={{ display: 'flex', gap: '20px', padding: '15px', background: 'var(--bg-main)', borderRadius: '16px', marginTop: '10px' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Loyalty Points</span>
                    <span className="badge" style={{ background: '#D1FAE5', color: '#065F46', fontSize: '0.95rem', padding: '6px 16px' }}>{customer.loyalty_points || 0} pts</span>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Lead Score</span>
                    <span className="badge" style={{ background: '#FEF3C7', color: '#92400E', fontSize: '0.95rem', padding: '6px 16px' }}>{customer.lead_score || 0}</span>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Notes</label>
                {isView ? (
                  <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '12px', fontSize: '0.85rem' }}>{formData.notes || 'No customer profile notes added.'}</div>
                ) : (
                  <textarea rows="3" value={formData.notes} onChange={e => handleInputChange('notes', e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '16px', fontSize: '0.875rem', width: '100%', resize: 'none' }} />
                )}
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: 'var(--bg-main)', padding: '15px', borderRadius: '16px', borderLeft: '4px solid var(--primary)' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><FiShield style={{ color: 'var(--primary)' }} /> GDPR Consent & Privacy</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                  European GDPR compliance mandates explicit consent for storing and processing personally identifiable information.
                </p>
                <div style={{ marginTop: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: isView ? 'default' : 'pointer' }}>
                    <input 
                      type="checkbox" 
                      disabled={isView}
                      checked={formData.gdpr_consent} 
                      onChange={e => handleInputChange('gdpr_consent', e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} 
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                      Explicit GDPR Consent Provided
                    </span>
                  </label>
                  {customer?.gdpr_consent_at && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: 5 }}>
                      Consented recorded on: {new Date(customer.gdpr_consent_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ background: 'var(--bg-main)', padding: '15px', borderRadius: '16px', borderLeft: '4px solid var(--color-purple-deep)' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><FiShield style={{ color: 'var(--color-purple-deep)' }} /> Two-Factor Authentication (2FA)</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                  Secure client portals require secondary user checks. Active 2FA status dictates portal permissions.
                </p>
                <div style={{ marginTop: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: isView ? 'default' : 'pointer' }}>
                    <input 
                      type="checkbox" 
                      disabled={isView}
                      checked={formData.two_factor_enabled === 1} 
                      onChange={e => handleInputChange('two_factor_enabled', e.target.checked ? 1 : 0)}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} 
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                      Enable Two-Factor Authentication for Client Portal
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ background: 'var(--bg-main)', padding: '15px', borderRadius: '16px', borderLeft: '4px solid var(--color-blue-cyan)' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><FiSliders style={{ color: 'var(--color-blue-cyan)' }} /> Notification Settings</h4>
                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: isView ? 'default' : 'pointer' }}>
                    <input 
                      type="checkbox" 
                      disabled={isView}
                      checked={formData.notification_enabled === 1} 
                      onChange={e => handleInputChange('notification_enabled', e.target.checked ? 1 : 0)}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} 
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                      Send Automated Itinerary & Invoice updates via Email/SMS
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ padding: '20px 30px', borderTop: '1px solid var(--divider)', margin: 0, justifyContent: 'space-between' }}>
          {isCreate ? (
            <button type="button" className="btn btn-outline" onClick={handleClearDraft} title="Clear saved entries for this form">
              <FiRotateCcw /> Clear
            </button>
          ) : <span />}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {isView ? 'Close' : 'Cancel'}
            </button>
            {!isView && (
              <button type="button" className="btn btn-primary" onClick={handleSubmit}>
                <FiSave /> {customer ? 'Save Changes' : 'Create Customer'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerModal;
