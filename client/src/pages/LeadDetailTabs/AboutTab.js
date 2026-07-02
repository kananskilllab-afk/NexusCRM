import React, { useState } from 'react';
import { useLeads } from '../../context/LeadContext';
import { api } from '../../services/api';
import { FiEdit2, FiSave, FiX } from 'react-icons/fi';

const AboutTab = ({ lead }) => {
  const { state, dispatch } = useLeads();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: lead.first_name, last_name: lead.last_name,
    mobile: lead.mobile, alternate_phone: lead.alternate_phone || '', email: lead.email,
    destination: lead.destination, lead_source: lead.lead_source || '',
    no_adults: lead.no_adults, no_children: lead.no_children,
    travel_start_date: lead.travel_start_date || '',
    travel_end_date: lead.travel_end_date || '',
    budget_range: lead.budget_range || '',
    preferred_channel: lead.preferred_channel || '',
    next_follow_up_date: lead.next_follow_up_date ? String(lead.next_follow_up_date).slice(0, 10) : '',
    priority: lead.priority, assigned_to: lead.assigned_to || ''
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateLead(lead.id, form);
      dispatch({ type: 'UPDATE_LEAD', payload: { id: lead.id, data: updated } });
      dispatch({ type: 'ADD_ACTIVITY', payload: { leadId: lead.id, activity: { text: 'Lead details updated', user: 'Admin' } } });
      setIsEditing(false);
    } catch (err) {
      alert(err.message || 'Failed to save lead details');
    } finally {
      setSaving(false);
    }
  };

  if (!lead) return null;

  const activeUserNames = (state.users || []).filter(u => !u.status || u.status === 'Active').map(u => u.name);
  const assignToOptions = ['', ...Array.from(new Set([...activeUserNames, ...(form.assigned_to ? [form.assigned_to] : [])]))];

  return (
    <div className="tab-content about-tab">
      <div className="info-section card">
        <div className="section-header">
          <h3>Lead Information — {lead.id}</h3>
          {!isEditing ? (
            <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)}><FiEdit2 /> Edit</button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}><FiSave /> {saving ? 'Saving…' : 'Save'}</button>
              <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(false)}><FiX /> Cancel</button>
            </div>
          )}
        </div>
        <div className="info-grid">
          {[
            { label: 'First Name', key: 'first_name' },
            { label: 'Last Name', key: 'last_name' },
            { label: 'Mobile', key: 'mobile' },
            { label: 'Alternate Phone', key: 'alternate_phone' },
            { label: 'Email', key: 'email' },
            { label: 'Destination', key: 'destination' },
            { label: 'Lead Source', key: 'lead_source' },
            { label: 'Budget Band', key: 'budget_range', options: ['', '<50k', '50k-1L', '1L-2L', '2L+'] },
            { label: 'Preferred Channel', key: 'preferred_channel', options: ['', 'Call', 'WhatsApp', 'Email'] },
            { label: 'Adults', key: 'no_adults', type: 'number' },
            { label: 'Children', key: 'no_children', type: 'number' },
            { label: 'Travel Start', key: 'travel_start_date', type: 'date' },
            { label: 'Travel End', key: 'travel_end_date', type: 'date' },
            { label: 'Next Follow-up', key: 'next_follow_up_date', type: 'date' },
            { label: 'Priority', key: 'priority', options: ['Hot', 'Normal', 'Cold'] },
            { label: 'Assigned To', key: 'assigned_to', options: assignToOptions },
            { label: 'Rating', key: 'rating', readOnly: true },
            { label: 'Lead Score', key: 'lead_score', readOnly: true },
            { label: 'Qualification', key: 'qualification_status', readOnly: true }
          ].map(field => (
            <div key={field.key} className="info-item">
              <label>{field.label}</label>
              {isEditing && !field.readOnly ? (
                field.options ? (
                  <select value={form[field.key] || ''} onChange={e => setForm({ ...form, [field.key]: e.target.value })}>
                    {field.options.map(o => <option key={o} value={o}>{o || '—'}</option>)}
                  </select>
                ) : (
                  <input type={field.type || 'text'} value={form[field.key] || ''} onChange={e => setForm({ ...form, [field.key]: e.target.value })} />
                )
              ) : (
                <span className={field.key === 'priority' ? `priority-badge ${(lead[field.key] || '').toLowerCase()}` : ''}>
                  {field.type === 'date' && lead[field.key] ? String(lead[field.key]).slice(0, 10) : (lead[field.key] ?? '—')}
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
        <div className="card" style={{ borderLeft: '4px solid var(--color-red)', background: 'var(--bg-main)' }}>
          <strong>⚠ Duplicate Detected:</strong> This lead may be a duplicate of <strong>{lead.duplicateOf}</strong>. Please review before proceeding.
        </div>
      )}
    </div>
  );
};

export default AboutTab;
