import React, { useState } from 'react';
import { useLeads, ROLE_HIERARCHY } from '../../context/LeadContext';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { FiEdit2, FiSave, FiX, FiFileText } from 'react-icons/fi';

const AboutTab = ({ lead }) => {
  const { state, dispatch } = useLeads();
  const toast = useToast();
  const userRole = state.currentUser?.role;
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const isOwner = lead && (lead.assigned_to === state.currentUser?.name || lead.owner === state.currentUser?.name);
  const canEdit = userLevel >= 3 || isOwner;

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
    priority: lead.priority, assigned_to: lead.assigned_to || '',
    passport_expiry_date: lead.passport_expiry_date ? String(lead.passport_expiry_date).slice(0, 10) : '',
    passport_service_type: lead.enquiry_data?.passport?.service_type || 'Passport Renewal / Re-issue',
    existing_passport_no: lead.enquiry_data?.passport?.existing_passport_no || '',
    rpo_location: lead.enquiry_data?.passport?.rpo_location || '',
    appointment_date: lead.enquiry_data?.passport?.appointment_date || '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        mobile: form.mobile,
        alternate_phone: form.alternate_phone,
        email: form.email,
        destination: form.destination,
        lead_source: form.lead_source,
        no_adults: form.no_adults,
        no_children: form.no_children,
        travel_start_date: form.travel_start_date,
        travel_end_date: form.travel_end_date,
        budget_range: form.budget_range,
        preferred_channel: form.preferred_channel,
        next_follow_up_date: form.next_follow_up_date,
        priority: form.priority,
        assigned_to: form.assigned_to,
        passport_expiry_date: form.passport_expiry_date || undefined,
        enquiry_data: {
          ...(lead.enquiry_data || {}),
          passport: {
            ...(lead.enquiry_data?.passport || {}),
            service_type: form.passport_service_type,
            existing_passport_no: form.existing_passport_no,
            rpo_location: form.rpo_location,
            appointment_date: form.appointment_date,
          }
        }
      };

      const updated = await api.updateLead(lead.id, payload);
      dispatch({ type: 'UPDATE_LEAD', payload: { id: lead.id, data: updated } });
      dispatch({ type: 'ADD_ACTIVITY', payload: { leadId: lead.id, activity: { text: 'Lead details updated', user: state.currentUser?.name || 'Admin' } } });
      setIsEditing(false);
      toast('Lead details updated successfully', 'success');
    } catch (err) {
      toast(err.message || 'Failed to save lead details', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!lead) return null;

  const activeUserNames = (state.users || []).filter(u => !u.status || u.status === 'Active').map(u => u.name);
  const assignToOptions = ['', ...Array.from(new Set([...activeUserNames, ...(form.assigned_to ? [form.assigned_to] : [])]))];

  const hasPassportDetails = lead.enquiry_types?.includes('Passport Assistance') ||
    lead.add_on_services?.includes('Passport Assistance') ||
    lead.enquiry_data?.passport?.existing_passport_no ||
    lead.passport_expiry_date ||
    isEditing;

  return (
    <div className="tab-content about-tab">
      <div className="info-section card">
        <div className="section-header">
          <h3>Lead Information — {lead.id}</h3>
          {!isEditing ? (
            canEdit ? (
              <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)}><FiEdit2 /> Edit</button>
            ) : (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>🔒 Read-only view</span>
            )
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

      {/* Passport & Document Details Card */}
      {hasPassportDetails && (
        <div className="card" style={{ marginTop: '16px', borderLeft: '4px solid var(--primary)' }}>
          <div className="section-header" style={{ marginBottom: '12px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiFileText /> Passport &amp; Renewal Details
            </h3>
          </div>
          <div className="info-grid">
            <div className="info-item">
              <label>Passport Service</label>
              {isEditing ? (
                <select value={form.passport_service_type} onChange={e => setForm({ ...form, passport_service_type: e.target.value })}>
                  <option>Fresh Passport</option>
                  <option>Passport Renewal / Re-issue</option>
                  <option>Tatkaal Passport</option>
                  <option>PCC (Police Clearance Certificate)</option>
                  <option>ECR / Non-ECR Change</option>
                  <option>Damaged / Lost Passport</option>
                </select>
              ) : (
                <span>{lead.enquiry_data?.passport?.service_type || '—'}</span>
              )}
            </div>

            <div className="info-item">
              <label>Existing Passport No</label>
              {isEditing ? (
                <input type="text" placeholder="e.g. N1234567" value={form.existing_passport_no} onChange={e => setForm({ ...form, existing_passport_no: e.target.value.toUpperCase() })} />
              ) : (
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{lead.enquiry_data?.passport?.existing_passport_no || '—'}</span>
              )}
            </div>

            <div className="info-item">
              <label>Passport Expiry Date</label>
              {isEditing ? (
                <input type="date" value={form.passport_expiry_date} onChange={e => setForm({ ...form, passport_expiry_date: e.target.value })} />
              ) : (
                <span>{lead.passport_expiry_date ? String(lead.passport_expiry_date).slice(0, 10) : '—'}</span>
              )}
            </div>

            <div className="info-item">
              <label>RPO Office / City</label>
              {isEditing ? (
                <input type="text" placeholder="e.g. Ahmedabad, Surat" value={form.rpo_location} onChange={e => setForm({ ...form, rpo_location: e.target.value })} />
              ) : (
                <span>{lead.enquiry_data?.passport?.rpo_location || '—'}</span>
              )}
            </div>

            <div className="info-item">
              <label>Preferred Appointment Date</label>
              {isEditing ? (
                <input type="date" value={form.appointment_date} onChange={e => setForm({ ...form, appointment_date: e.target.value })} />
              ) : (
                <span>{lead.enquiry_data?.passport?.appointment_date || '—'}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Visa Enquiry Details */}
      {(lead.enquiry_types?.includes('Visa') || lead.enquiry_data?.visa) && (
        <div className="info-section card" style={{ marginTop: '16px' }}>
          <div className="section-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              🛂 Visa Requirements
            </h3>
          </div>
          <div className="info-grid">
            <div className="info-item">
              <label>Visa Category</label>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                {lead.enquiry_data?.visa?.visa_type || 'Visitor / Tourist Visa'}
              </span>
            </div>
            <div className="info-item">
              <label>Entry Type</label>
              <span>{lead.enquiry_data?.visa?.entry_type || 'Single Entry'}</span>
            </div>
            <div className="info-item">
              <label>Processing Priority</label>
              <span>{lead.enquiry_data?.visa?.processing_speed || 'Standard'}</span>
            </div>
          </div>
        </div>
      )}

      <div className="enquiry-section card" style={{ marginTop: '16px' }}>
        <h3>Requested Services</h3>
        <div className="services-list" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(lead.enquiry_types || []).map(type => (
            <div key={type} className="service-badge">{type}</div>
          ))}
          {(lead.add_on_services || []).map(type => (
            <div key={type} className="service-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>+ {type}</div>
          ))}
        </div>
      </div>

      {lead.isDuplicate && (
        <div className="card" style={{ borderLeft: '4px solid var(--color-red)', background: 'var(--bg-main)', marginTop: '16px' }}>
          <strong>⚠ Duplicate Detected:</strong> This lead may be a duplicate of <strong>{lead.duplicateOf}</strong>. Please review before proceeding.
        </div>
      )}
    </div>
  );
};

export default AboutTab;
