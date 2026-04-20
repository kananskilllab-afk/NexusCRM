import React, { useState } from 'react';
import { useLeads } from '../../context/LeadContext';
import { FiPlus, FiPhone, FiMail, FiMessageCircle } from 'react-icons/fi';

const FollowUpTab = ({ lead }) => {
  const { dispatch } = useLeads();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ method: 'Phone', notes: '', outcome: 'Interested', nextDate: '' });

  const handleAdd = () => {
    if (!form.notes) return;
    dispatch({ type: 'ADD_FOLLOWUP', payload: { leadId: lead.id, followUp: form } });
    setForm({ method: 'Phone', notes: '', outcome: 'Interested', nextDate: '' });
    setShowForm(false);
  };

  const followUps = lead.followUps || [];
  const methodIcon = { Phone: <FiPhone />, Email: <FiMail />, WhatsApp: <FiMessageCircle />, Meeting: <FiPhone /> };

  return (
    <div className="tab-content">
      <div className="card">
        <div className="section-header">
          <h3>Follow-Up Log ({followUps.length})</h3>
          <button className="btn-text" onClick={() => setShowForm(!showForm)}><FiPlus /> Log Follow-Up</button>
        </div>

        {showForm && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '1rem 0', borderBottom: '1px solid var(--divider)' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>Method</label>
              <select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <option>Phone</option><option>Email</option><option>WhatsApp</option><option>Meeting</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>Outcome</label>
              <select value={form.outcome} onChange={e => setForm({ ...form, outcome: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <option>Interested</option><option>Not Available</option><option>Will Decide Later</option><option>Not Interested</option><option>Callback Requested</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>Notes*</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>Next Follow-Up Date</label>
              <input type="datetime-local" value={form.nextDate} onChange={e => setForm({ ...form, nextDate: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={handleAdd}>Save Follow-Up</button>
            </div>
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          {followUps.map(f => (
            <div key={f.id} style={{ display: 'flex', gap: '14px', padding: '14px 0', borderBottom: '1px solid var(--divider)' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                {methodIcon[f.method] || <FiPhone />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{f.method} Call</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(f.date).toLocaleString()}</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{f.notes}</p>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
                  <span className={`badge ${f.outcome === 'Interested' ? 'new' : f.outcome === 'Not Interested' ? 'lost' : 'working'}`}>{f.outcome}</span>
                  {f.nextDate && <span style={{ color: 'var(--text-muted)' }}>Next: {new Date(f.nextDate).toLocaleDateString()}</span>}
                </div>
              </div>
            </div>
          ))}
          {followUps.length === 0 && <p className="text-muted" style={{ textAlign: 'center', padding: '2rem 0' }}>No follow-ups recorded yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default FollowUpTab;
