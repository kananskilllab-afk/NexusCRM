import React, { useState } from 'react';
import { useLeads } from '../../context/LeadContext';
import { FiPlus, FiCheck, FiClock, FiBell } from 'react-icons/fi';

const RemindersTab = ({ lead }) => {
  const { dispatch } = useLeads();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ text: '', date: '' });

  const handleAdd = () => {
    if (!form.text || !form.date) return;
    dispatch({ type: 'ADD_REMINDER', payload: { leadId: lead.id, reminder: form } });
    setForm({ text: '', date: '' });
    setShowForm(false);
  };

  const toggleDone = (reminderId) => {
    dispatch({ type: 'TOGGLE_REMINDER', payload: { leadId: lead.id, reminderId } });
  };

  const reminders = lead.reminders || [];
  const pending = reminders.filter(r => !r.done);
  const completed = reminders.filter(r => r.done);

  return (
    <div className="tab-content">
      <div className="card">
        <div className="section-header">
          <h3><FiBell /> Reminders ({pending.length} pending)</h3>
          <button className="btn-text" onClick={() => setShowForm(!showForm)}><FiPlus /> Add Reminder</button>
        </div>

        {showForm && (
          <div className="inline-form" style={{ display: 'flex', gap: '10px', padding: '1rem 0', borderBottom: '1px solid var(--divider)' }}>
            <input type="text" placeholder="Reminder text..." value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} style={{ flex: 2, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
            <input type="datetime-local" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
            <button className="btn btn-primary btn-sm" onClick={handleAdd}>Add</button>
          </div>
        )}

        <div className="reminder-list" style={{ marginTop: '1rem' }}>
          {pending.map(r => (
            <div key={r.id} className="reminder-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--divider)' }}>
              <button onClick={() => toggleDone(r.id)} style={{ background: 'none', border: '2px solid var(--primary)', borderRadius: '4px', width: '22px', height: '22px', cursor: 'pointer' }}></button>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 500 }}>{r.text}</p>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}><FiClock /> {new Date(r.date).toLocaleString()}</span>
              </div>
            </div>
          ))}
          {pending.length === 0 && <p className="text-muted" style={{ padding: '1rem 0' }}>No pending reminders.</p>}
        </div>

        {completed.length > 0 && (
          <>
            <h4 style={{ marginTop: '1.5rem', color: 'var(--text-muted)' }}>Completed ({completed.length})</h4>
            {completed.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', opacity: 0.5, textDecoration: 'line-through' }}>
                <FiCheck color="green" />
                <span>{r.text}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default RemindersTab;
