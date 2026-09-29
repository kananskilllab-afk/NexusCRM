import React, { useState } from 'react';
import { useLeads } from '../../context/LeadContext';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { FiPlus, FiTrash2, FiUser } from 'react-icons/fi';

const TravellerTab = ({ lead }) => {
  const { dispatch } = useLeads();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'Adult', passport: '', dob: '' });

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast('Traveller name is required', 'error');
      return;
    }
    const newTraveller = {
      ...form,
      id: `trv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: form.name.trim(),
      passport: (form.passport || '').trim().toUpperCase(),
    };
    const currentTravellers = Array.isArray(lead.travellers) ? lead.travellers : [];
    const updatedTravellers = [...currentTravellers, newTraveller];

    setLoading(true);
    try {
      await api.updateLead(lead.id, { travellers: updatedTravellers });
      dispatch({ type: 'UPDATE_LEAD', payload: { id: lead.id, data: { travellers: updatedTravellers } } });
      dispatch({ type: 'ADD_TRAVELLER', payload: { leadId: lead.id, traveller: newTraveller } });
      setForm({ name: '', type: 'Adult', passport: '', dob: '' });
      setShowForm(false);
      toast('Traveller and passport details saved successfully', 'success');
    } catch (err) {
      toast(err.message || 'Failed to save traveller', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (travellerId) => {
    const currentTravellers = Array.isArray(lead.travellers) ? lead.travellers : [];
    const updatedTravellers = currentTravellers.filter(t => t.id !== travellerId);

    try {
      await api.updateLead(lead.id, { travellers: updatedTravellers });
      dispatch({ type: 'UPDATE_LEAD', payload: { id: lead.id, data: { travellers: updatedTravellers } } });
      dispatch({ type: 'REMOVE_TRAVELLER', payload: { leadId: lead.id, travellerId } });
      toast('Traveller removed', 'success');
    } catch (err) {
      toast(err.message || 'Failed to remove traveller', 'error');
    }
  };

  const travellers = Array.isArray(lead.travellers) ? lead.travellers : [];
  const adults = travellers.filter(t => t.type === 'Adult');
  const children = travellers.filter(t => t.type === 'Child');
  const infants = travellers.filter(t => t.type === 'Infant');

  return (
    <div className="tab-content">
      <div className="card">
        <div className="section-header">
          <h3><FiUser /> Traveller Details ({travellers.length} pax)</h3>
          <button className="btn-text" onClick={() => setShowForm(!showForm)}>
            <FiPlus /> {showForm ? 'Cancel' : 'Add Traveller'}
          </button>
        </div>

        {showForm && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '10px', padding: '1rem 0', borderBottom: '1px solid var(--divider)', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Full Name*</label>
              <input type="text" placeholder="e.g. John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <option>Adult</option><option>Child</option><option>Infant</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Passport No.</label>
              <input type="text" placeholder="e.g. N1234567" value={form.passport} onChange={e => setForm({ ...form, passport: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Date of Birth</label>
              <input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={loading}>
              {loading ? 'Adding…' : 'Add'}
            </button>
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          {adults.length > 0 && (
            <>
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Adults ({adults.length})</h4>
              {adults.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: 'var(--bg-main)', borderRadius: '8px', marginBottom: '8px' }}>
                  <div style={{ width: 36, height: 36, background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><FiUser /></div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, margin: 0 }}>{t.name}</p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Passport: <strong style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{t.passport || '—'}</strong> • DOB: {t.dob || '—'}
                    </span>
                  </div>
                  <button className="btn-icon text-muted" onClick={() => handleRemove(t.id)} title="Delete traveller"><FiTrash2 /></button>
                </div>
              ))}
            </>
          )}

          {children.length > 0 && (
            <>
              <h4 style={{ margin: '1rem 0 0.5rem', color: 'var(--text-secondary)' }}>Children ({children.length})</h4>
              {children.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: 'var(--bg-main)', borderRadius: '8px', marginBottom: '8px' }}>
                  <div style={{ width: 36, height: 36, background: '#FFF7ED', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F97316' }}><FiUser /></div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, margin: 0 }}>{t.name}</p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Passport: <strong style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{t.passport || '—'}</strong> • DOB: {t.dob || '—'}
                    </span>
                  </div>
                  <button className="btn-icon text-muted" onClick={() => handleRemove(t.id)} title="Delete traveller"><FiTrash2 /></button>
                </div>
              ))}
            </>
          )}

          {infants.length > 0 && (
            <>
              <h4 style={{ margin: '1rem 0 0.5rem', color: 'var(--text-secondary)' }}>Infants ({infants.length})</h4>
              {infants.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: 'var(--bg-main)', borderRadius: '8px', marginBottom: '8px' }}>
                  <div style={{ width: 36, height: 36, background: '#F0FDF4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}><FiUser /></div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, margin: 0 }}>{t.name}</p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Passport: <strong style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{t.passport || '—'}</strong> • DOB: {t.dob || '—'}
                    </span>
                  </div>
                  <button className="btn-icon text-muted" onClick={() => handleRemove(t.id)} title="Delete traveller"><FiTrash2 /></button>
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
