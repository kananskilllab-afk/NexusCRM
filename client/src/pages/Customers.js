import React, { useState } from 'react';
import { useLeads } from '../context/LeadContext';
import { FiPlus, FiSearch, FiPhone, FiMail, FiMapPin } from 'react-icons/fi';

const Customers = () => {
  const { state, dispatch } = useLeads();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', totalBookings: 0, totalSpent: 0 });

  // 1. Dedicated customer state
  const manualCustomers = state.customers || [];
  
  // 2. Derive customers from leads
  const derivedCustomers = state.leads.map(l => ({
    id: l.id,
    name: `${l.first_name} ${l.last_name}`,
    email: l.email,
    phone: l.mobile,
    status: l.status === 'Booked' ? 'Customer' : 'Prospect',
    destination: l.destination,
    lastActivity: l.booking_date || l.created_at
  }));

  // 3. Combine and deduplicate (by phone)
  const allCustomers = [...manualCustomers, ...derivedCustomers].filter((v, i, a) => a.findIndex(t => t.phone === v.phone) === i);

  // 4. Filter the combined list
  const filtered = allCustomers.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  );

  const handleAdd = () => {
    if (!form.name || !form.phone) return;
    dispatch({ type: 'ADD_CUSTOMER', payload: { ...form, id: `C-${Date.now()}`, lastActivity: new Date().toISOString() } });
    setForm({ name: '', email: '', phone: '', city: '', totalBookings: 0, totalSpent: 0 });
    setShowForm(false);
  };

  return (
    <div className="lead-list-page">
      <div className="page-header">
        <div className="header-left">
          <h1>Customer Directory</h1>
          <p className="text-secondary">{filtered.length} customers / prospects matching search</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><FiPlus /> Add Customer</button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>New Customer</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', alignItems: 'end' }}>
            <div className="form-group"><label>Full Name*</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-group"><label>Phone*</label><input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <button className="btn btn-primary" onClick={handleAdd}>Save Customer</button>
          </div>
        </div>
      )}

      <div className="filter-bar card">
        <div className="filter-group"><FiSearch className="icon" /><input type="text" placeholder="Search by name, email, phone..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>

      <div className="table-container card" style={{ marginTop: '1rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Last Destination</th>
              <th>Status</th>
              <th>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 32, height: 32, background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem' }}>
                      {(c.name || 'U').charAt(0)}
                    </div>
                    <strong>{c.name}</strong>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '0.85rem' }}>
                    <div><FiPhone style={{ marginRight: 4, opacity: 0.5 }} />{c.phone}</div>
                    <div style={{ color: 'var(--text-muted)' }}><FiMail style={{ marginRight: 4, opacity: 0.5 }} />{c.email}</div>
                  </div>
                </td>
                <td><FiMapPin style={{ marginRight: 4, opacity: 0.5 }} />{c.destination || 'N/A'}</td>
                <td><span className={`badge ${c.status === 'Customer' ? 'new' : 'working'}`}>{c.status || 'Prospect'}</span></td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.lastActivity ? new Date(c.lastActivity).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No customers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Customers;
