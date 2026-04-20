import React, { useState } from 'react';
import { useLeads } from '../../context/LeadContext';
import { FiPlus, FiTrash2, FiUser } from 'react-icons/fi';

const TravellerTab = ({ lead }) => {
  const { dispatch } = useLeads();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'Adult', passport: '', dob: '' });

  const handleAdd = () => {
    if (!form.name) return;
    dispatch({ type: 'ADD_TRAVELLER', payload: { leadId: lead.id, traveller: form } });
    setForm({ name: '', type: 'Adult', passport: '', dob: '' });
    setShowForm(false);
  };

  const handleRemove = (travellerId) => {
    dispatch({ type: 'REMOVE_TRAVELLER', payload: { leadId: lead.id, travellerId } });
  };

  const travellers = lead.travellers || [];
  const adults = travellers.filter(t => t.type === 'Adult');
  const children = travellers.filter(t => t.type === 'Child');

  return (
    <div className="tab-content">
      <div className="card">
        <div className="section-header">
          <h3><FiUser /> Traveller Details ({travellers.length} pax)</h3>
          <button className="btn-text" onClick={() => setShowForm(!showForm)}><FiPlus /> Add Traveller</button>
        </div>

        {showForm && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '10px', padding: '1rem 0', borderBottom: '1px solid var(--divider)', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Full Name*</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <option>Adult</option><option>Child</option><option>Infant</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Passport No.</label>
              <input type="text" value={form.passport} onChange={e => setForm({ ...form, passport: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Date of Birth</label>
              <input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleAdd}>Add</button>
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Adults ({adults.length})</h4>
          {adults.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: 'var(--bg-main)', borderRadius: '8px', marginBottom: '8px' }}>
              <div style={{ width: 36, height: 36, background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><FiUser /></div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600 }}>{t.name}</p>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Passport: {t.passport || '—'} • DOB: {t.dob || '—'}</span>
              </div>
              <button className="btn-icon text-muted" onClick={() => handleRemove(t.id)}><FiTrash2 /></button>
            </div>
          ))}

          {children.length > 0 && (
            <>
              <h4 style={{ margin: '1rem 0 0.5rem', color: 'var(--text-secondary)' }}>Children ({children.length})</h4>
              {children.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: 'var(--bg-main)', borderRadius: '8px', marginBottom: '8px' }}>
                  <div style={{ width: 36, height: 36, background: '#FFF7ED', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F97316' }}><FiUser /></div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600 }}>{t.name}</p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Passport: {t.passport || '—'} • DOB: {t.dob || '—'}</span>
                  </div>
                  <button className="btn-icon text-muted" onClick={() => handleRemove(t.id)}><FiTrash2 /></button>
                </div>
              ))}
            </>
          )}

          {travellers.length === 0 && <p className="text-muted" style={{ textAlign: 'center', padding: '2rem 0' }}>No travellers added. Click "Add Traveller" to begin.</p>}
        </div>
      </div>
    </div>
  );
};

export default TravellerTab;
