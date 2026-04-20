import React, { useState } from 'react';
import { useLeads } from '../context/LeadContext';
import { FiPlus, FiUser, FiMail, FiShield, FiMoreVertical, FiTrash2, FiEdit2 } from 'react-icons/fi';

const Users = () => {
  const { state, dispatch } = useLeads();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'Sales Person', status: 'Active' });

  const ROLES = ['Admin', 'Manager', 'Accountant', 'Sales Person', 'Operations'];

  const handleAdd = () => {
    if (!form.name || !form.email) return;
    dispatch({ type: 'ADD_USER', payload: form });
    setForm({ name: '', email: '', role: 'Sales Person', status: 'Active' });
    setShowModal(false);
  };

  return (
    <div className="lead-list-page">
      <div className="page-header">
        <div className="header-left">
          <h1>Team Management</h1>
          <p className="text-secondary">{(state.users || []).length} total staff members</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><FiPlus /> Create User</button>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '400px' }}>
            <div className="modal-header"><h3>Add Team Member</h3><button className="close-btn" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-form">
              <div className="form-group"><label>Full Name*</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="form-group"><label>Email Address*</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="form-group"><label>Role / Designation</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAdd}>Save User</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="table-container card">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Contact Info</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(state.users || []).map(user => (
              <tr key={user.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 36, height: 36, background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 700 }}>
                      {user.name.charAt(0)}
                    </div>
                    <strong>{user.name} {user.id === state.currentUser.id && <span style={{ fontSize: '0.65rem', background: '#FEE2E2', color: '#EF4444', padding: '2px 6px', borderRadius: 4, marginLeft: 4 }}>YOU</span>}</strong>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}><FiMail style={{ marginRight: 4 }} />{user.email}</div>
                </td>
                <td>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FiShield style={{ color: user.role === 'Admin' ? 'var(--status-hot)' : 'var(--primary)' }} />
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`badge ${user.status === 'Active' ? 'new' : 'unqualified'}`}>{user.status}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-icon"><FiEdit2 /></button>
                    <button className="btn-icon text-danger" disabled={user.role === 'Admin'}><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
        <h3 style={{ marginBottom: '10px' }}>Role Permissions Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div><strong>Admin:</strong> Full access to all modules, reports, and team settings.</div>
          <div><strong>Manager:</strong> Can manage leads, view all staff reports, assign tasks.</div>
          <div><strong>Sales Person:</strong> Can only see assigned leads, follow-ups, and personal targets.</div>
          <div><strong>Accountant:</strong> Exclusive access to billing, invoices, and financial reports.</div>
        </div>
      </div>
    </div>
  );
};

export default Users;
