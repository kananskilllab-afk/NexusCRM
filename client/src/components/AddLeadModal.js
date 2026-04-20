import React, { useState } from 'react';
import { FiX, FiSave, FiGlobe, FiHome, FiFileText, FiMap, FiUser, FiActivity } from 'react-icons/fi';
import './Modal.css';

const ENQUIRY_OPTIONS = [
  { id: 'Flight', icon: <FiGlobe /> },
  { id: 'Hotel', icon: <FiHome /> },
  { id: 'Visa', icon: <FiFileText /> },
  { id: 'Package', icon: <FiMap /> }
];

const SOURCE_OPTIONS = ['Website', 'Facebook Ad', 'Google Ad', 'Referral', 'Walk-in', 'Phone Call', 'WhatsApp', 'Instagram', 'Email', 'Other'];

const AddLeadModal = ({ isOpen, onClose, onSave }) => {
  const [activeType, setActiveType] = useState('Package');
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', mobile: '', email: '',
    destination: '', no_adults: 1, no_children: 0,
    priority: 'Normal', lead_source: 'Website',
    assigned_to: 'Bhargav', travel_start_date: '', travel_end_date: '',
    enquiry_data: {}
  });
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.mobile || (activeType !== 'Visa' && !formData.destination)) {
      setError('First name, mobile, and destination are required.');
      return;
    }
    setError('');
    onSave({ ...formData, enquiry_types: [activeType] });
    onClose();
  };

  const updateSubData = (field, val) => {
    setFormData({
      ...formData,
      enquiry_data: { ...formData.enquiry_data, [activeType.toLowerCase()]: { ...formData.enquiry_data[activeType.toLowerCase()], [field]: val } }
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content card" style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2>Create New Lead</h2>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>
        
        {/* Enquiry Type Selector */}
        <div className="enquiry-selector" style={{ display: 'flex', gap: '10px', marginBottom: '20px', padding: '10px', background: 'var(--bg-main)', borderRadius: '10px' }}>
          {ENQUIRY_OPTIONS.map(opt => (
            <button 
              key={opt.id} 
              className={`select-btn ${activeType === opt.id ? 'active' : ''}`}
              onClick={() => setActiveType(opt.id)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: activeType === opt.id ? 'var(--primary)' : 'white', color: activeType === opt.id ? 'white' : 'inherit' }}
            >
              {opt.icon} {opt.id}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: 15 }}>{error}</div>}

          <div className="form-section">
            <h4><FiUser style={{ marginRight: 8 }} /> Personal Details</h4>
            <div className="form-row">
              <div className="form-group"><label>First Name*</label><input type="text" required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} /></div>
              <div className="form-group"><label>Last Name</label><input type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Mobile*</label><input type="tel" required value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} /></div>
              <div className="form-group"><label>Email</label><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
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
                  <div className="form-group"><label>Origin</label><input type="text" placeholder="DEL" onChange={e => updateSubData('origin', e.target.value)} /></div>
                  <div className="form-group"><label>Class</label>
                    <select onChange={e => updateSubData('class', e.target.value)}>
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
                    <select onChange={e => updateSubData('stars', e.target.value)}>
                      <option>3*</option><option>4*</option><option>5*</option><option>Boutique</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Meal Plan</label>
                    <select onChange={e => updateSubData('mealPlan', e.target.value)}>
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
          </div>

          <div className="modal-footer" style={{ marginTop: 25 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary"><FiSave /> Create {activeType} Lead</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLeadModal;
