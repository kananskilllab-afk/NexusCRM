import React, { useState } from 'react';
import { useLeads } from '../context/LeadContext';
import { FiPlus, FiEdit2, FiPhone, FiMail, FiStar, FiTruck, FiSearch } from 'react-icons/fi';

const SupplierModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ name: '', type: 'Hotel', contact: '', phone: '', email: '', gst: '', paymentTerms: 'Net 30', creditLimit: '', currency: 'INR', services: [] });
  const TYPE_OPTIONS = ['Hotel', 'Flight Consolidator', 'Visa Agency', 'Transport', 'Activity Provider', 'Other'];
  const svcOptions = ['Hotel', 'Flight', 'Visa', 'Transport', 'Activity', 'Insurance'];

  return (
    <div className="modal-overlay">
      <div className="modal-content card" style={{ maxWidth: '640px' }}>
        <div className="modal-header"><h2>Add New Supplier</h2><button className="close-btn" onClick={onClose}>✕</button></div>
        <div className="modal-form">
          <div className="form-row">
            <div className="form-group"><label>Supplier Name*</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-group"><label>Type*</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Contact Person</label><input type="text" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></div>
            <div className="form-group"><label>Phone</label><input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form-group"><label>GST Number</label><input type="text" value={form.gst} onChange={e => setForm({ ...form, gst: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Payment Terms</label>
              <select value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })}>
                <option>Prepaid</option><option>Net 15</option><option>Net 30</option><option>Net 45</option>
              </select>
            </div>
            <div className="form-group"><label>Credit Limit (₹)</label><input type="number" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: e.target.value })} /></div>
          </div>
          <div className="form-group">
            <label>Services Offered</label>
            <div className="checkbox-grid">
              {svcOptions.map(opt => (
                <label key={opt} className="checkbox-item">
                  <input type="checkbox" checked={form.services.includes(opt)} onChange={e => {
                    const updated = e.target.checked ? [...form.services, opt] : form.services.filter(s => s !== opt);
                    setForm({ ...form, services: updated });
                  }} />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { if (form.name) { onSave(form); onClose(); } }}>Add Supplier</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Suppliers = () => {
  const { state, dispatch } = useLeads();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');

  const suppliers = state.suppliers || [];
  const filtered = suppliers.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.contact?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'All' || s.type === filterType;
    return matchSearch && matchType;
  });

  const types = ['All', ...new Set(suppliers.map(s => s.type))];

  const typeColor = { 'Hotel': '#0D9488', 'Flight Consolidator': '#3B82F6', 'Visa Agency': '#8B5CF6', 'Transport': '#F59E0B', 'Activity Provider': '#EF4444' };

  return (
    <div className="lead-list-page">
      <div className="page-header">
        <div className="header-left">
          <h1>Supplier Management</h1>
          <p className="text-muted">{suppliers.length} registered suppliers</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><FiPlus /> Add Supplier</button>
        </div>
      </div>

      {showModal && <SupplierModal onClose={() => setShowModal(false)} onSave={(data) => dispatch({ type: 'ADD_SUPPLIER', payload: data })} />}

      <div className="filter-bar card">
        <div className="filter-group"><FiSearch className="icon" /><input type="text" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="filter-group">
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            {types.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
        {filtered.map(sup => (
          <div key={sup.id} className="card" style={{ borderTop: `4px solid ${typeColor[sup.type] || '#94A3B8'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: '10px', background: `${typeColor[sup.type] || '#94A3B8'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: typeColor[sup.type] || '#94A3B8' }}>
                  <FiTruck size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{sup.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: typeColor[sup.type] || '#94A3B8', fontWeight: 600 }}>{sup.type}</span>
                </div>
              </div>
              <span className={`badge ${sup.status === 'Active' ? 'new' : 'lost'}`}>{sup.status}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <FiPhone style={{ color: 'var(--text-muted)' }} />{sup.phone || '—'}
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <FiMail style={{ color: 'var(--text-muted)' }} />{sup.email || '—'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--divider)', fontSize: '0.82rem' }}>
              <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Credit Limit</span><strong>₹{sup.creditLimit?.toLocaleString() || '0'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Balance</span><strong style={{ color: sup.balance > 0 ? 'var(--status-hot)' : 'var(--status-booked)' }}>₹{sup.balance?.toLocaleString() || '0'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Terms</span><strong>{sup.paymentTerms}</strong></div>
              {sup.rating && <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Rating</span><strong style={{ color: '#F59E0B' }}><FiStar /> {sup.rating}</strong></div>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
            <p className="text-muted">No suppliers found. Add your first supplier to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Suppliers;
