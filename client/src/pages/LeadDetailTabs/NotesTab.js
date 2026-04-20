import React, { useState } from 'react';
import { useLeads } from '../../context/LeadContext';
import { FiPlus, FiMessageSquare } from 'react-icons/fi';

const NotesTab = ({ lead }) => {
  const { dispatch } = useLeads();
  const [noteText, setNoteText] = useState('');

  const handleAdd = () => {
    if (!noteText.trim()) return;
    dispatch({ type: 'ADD_NOTE', payload: { leadId: lead.id, note: { text: noteText, user: 'Admin' } } });
    setNoteText('');
  };

  const notes = lead.notes || [];

  return (
    <div className="tab-content">
      <div className="card">
        <div className="section-header">
          <h3><FiMessageSquare /> Notes ({notes.length})</h3>
        </div>

        <div style={{ display: 'flex', gap: '10px', padding: '1rem 0', borderBottom: '1px solid var(--divider)' }}>
          <textarea
            placeholder="Add a note about this lead..."
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            rows={3}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.9rem' }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleAdd} style={{ alignSelf: 'flex-end' }}><FiPlus /> Add</button>
        </div>

        <div style={{ marginTop: '1rem' }}>
          {notes.map(note => (
            <div key={note.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--divider)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{note.user}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(note.date).toLocaleString()}</span>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{note.text}</p>
            </div>
          ))}
          {notes.length === 0 && <p className="text-muted" style={{ padding: '2rem 0', textAlign: 'center' }}>No notes yet. Add your first note above.</p>}
        </div>
      </div>
    </div>
  );
};

export default NotesTab;
