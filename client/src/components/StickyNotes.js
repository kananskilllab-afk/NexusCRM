import React, { useState, useEffect } from 'react';
import { FiEdit, FiTrash2, FiPlus, FiX } from 'react-icons/fi';

const StickyNotes = ({ isOpen, onClose }) => {
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('nexusCRM_StickyNotes');
    return saved ? JSON.parse(saved) : [{ id: 1, text: 'Welcome to Nexus CRM! Use this to jot down quick numbers or notes.', color: '#FEF9C3' }];
  });

  useEffect(() => {
    localStorage.setItem('nexusCRM_StickyNotes', JSON.stringify(notes));
  }, [notes]);

  const addNote = () => {
    const colors = ['#FEF9C3', '#E0F2FE', '#FEE2E2', '#F0FDF4'];
    setNotes([...notes, { id: Date.now(), text: '', color: colors[notes.length % colors.length] }]);
  };

  const updateNote = (id, text) => {
    setNotes(notes.map(n => n.id === id ? { ...n, text } : n));
  };

  const deleteNote = (id) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="sticky-notes-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.1)' }}>
      <div className="sticky-notes-panel" onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 60, right: 200, width: '300px', background: 'white', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
        <div className="panel-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.9rem' }}><FiEdit /> Sticky Notes</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-icon" onClick={addNote}><FiPlus /></button>
            <button className="btn-icon" onClick={onClose}><FiX /></button>
          </div>
        </div>
        <div className="panel-body" style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notes.map(note => (
            <div key={note.id} style={{ padding: '12px', borderRadius: '8px', background: note.color, border: '1px solid rgba(0,0,0,0.05)', position: 'relative' }}>
              <textarea 
                value={note.text} 
                placeholder="Type something..."
                onChange={e => updateNote(note.id, e.target.value)}
                style={{ width: '100%', background: 'transparent', border: 'none', resize: 'none', fontSize: '0.85rem', outline: 'none', color: 'var(--text-primary)', minHeight: '60px' }}
              />
              <button 
                onClick={() => deleteNote(note.id)}
                style={{ position: 'absolute', top: 4, right: 4, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'rgba(0,0,0,0.3)' }}
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
          {notes.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No notes yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default StickyNotes;
