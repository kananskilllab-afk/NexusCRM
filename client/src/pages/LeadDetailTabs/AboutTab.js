import React, { useState } from 'react';
import { useLeads } from '../../context/LeadContext';
import { FiEdit2, FiSave, FiX } from 'react-icons/fi';

const AboutTab = ({ lead }) => {
  const { dispatch } = useLeads();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: lead.first_name, last_name: lead.last_name,
    mobile: lead.mobile, email: lead.email,
    destination: lead.destination, lead_source: lead.lead_source || '',
    no_adults: lead.no_adults, no_children: lead.no_children,
    travel_start_date: lead.travel_start_date || '',
    travel_end_date: lead.travel_end_date || '',
    priority: lead.priority, assigned_to: lead.assigned_to || ''
  });

  const handleSave = () => {
    dispatch({ type: 'UPDATE_LEAD', payload: { id: lead.id, data: form } });
    dispatch({ type: 'ADD_ACTIVITY', payload: { leadId: lead.id, activity: { text: 'Lead details updated', user: 'Admin' } } });
    setIsEditing(false);
  };

  if (!lead) return null;

  return (
    <div className="tab-content about-tab">
      <div className="info-section card">
        <div className="section-header">
          <h3>Lead Information — {lead.id}</h3>
          {!isEditing ? (
            <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)}><FiEdit2 /> Edit</button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary btn-sm" onClick={handleSave}><FiSave /> Save</button>
              <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(false)}><FiX /> Cancel</button>
            </div>
          )}
        </div>
        <div className="info-grid">
          {[
            { label: 'First Name', key: 'first_name' },
            { label: 'Last Name', key: 'last_name' },
            { label: 'Mobile', key: 'mobile' },
            { label: 'Email', key: 'email' },
            { label: 'Destination', key: 'destination' },
            { label: 'Lead Source', key: 'lead_source' },
            { label: 'Adults', key: 'no_adults', type: 'number' },
            { label: 'Children', key: 'no_children', type: 'number' },
            { label: 'Travel Start', key: 'travel_start_date', type: 'date' },
            { label: 'Travel End', key: 'travel_end_date', type: 'date' },
            { label: 'Priority', key: 'priority' },
            { label: 'Assigned To', key: 'assigned_to' }
          ].map(field => (
            <div key={field.key} className="info-item">
              <label>{field.label}</label>
              {isEditing ? (
                field.key === 'priority' ? (
                  <select value={form[field.key]} onChange={e => setForm({ ...form, [field.key]: e.target.value })}>
                    <option>Hot</option><option>Normal</option><option>Cold</option>
                  </select>
                ) : (
                  <input type={field.type || 'text'} value={form[field.key] || ''} onChange={e => setForm({ ...form, [field.key]: e.target.value })} />
                )
              ) : (
                <span className={field.key === 'priority' ? `priority-badge ${(lead[field.key] || '').toLowerCase()}` : ''}>
                  {lead[field.key] || '—'}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="enquiry-section card">
        <h3>Requested Services</h3>
        <div className="services-list">
          {lead.enquiry_types.map(type => (
            <div key={type} className="service-badge">{type}</div>
          ))}
        </div>
      </div>

      {lead.isDuplicate && (
        <div className="card" style={{ borderLeft: '4px solid #EF4444', background: '#FEF2F2' }}>
          <strong>⚠ Duplicate Detected:</strong> This lead may be a duplicate of <strong>{lead.duplicateOf}</strong>. Please review before proceeding.
        </div>
      )}
    </div>
  );
};

export default AboutTab;
