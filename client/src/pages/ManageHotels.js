import React, { useState, useEffect } from 'react';
import { FiPlus, FiHome, FiStar, FiMapPin, FiSearch, FiTrash2, FiEdit2, FiCheck, FiX } from 'react-icons/fi';
import { api } from '../services/api';

const ManageHotels = () => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', star: '3', is_preferred: false });

  useEffect(() => {
    loadHotels();
  }, []);

  const loadHotels = async () => {
    try {
      const data = await api.getHotels();
      setHotels(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.name || !form.city) return alert('Name and city are required.');
    setSaving(true);
    try {
      await api.createHotel(form);
      await loadHotels();
      setShowAdd(false);
      setForm({ name: '', city: '', star: '3', is_preferred: false });
    } catch (e) {
      alert(e.message || 'Failed to add hotel');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this hotel?')) return;
    try {
      await api.deleteHotel(id);
      setHotels(prev => prev.filter(h => h.id !== id));
    } catch (e) {
      alert(e.message || 'Failed to delete');
    }
  };

  const filteredHotels = hotels.filter(h => 
    h.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="lead-list-page">
      <div className="page-header">
        <div className="header-left">
          <h1>Hotel Catalog</h1>
          <p className="text-secondary">{hotels.length} partner hotels registered.</p>
        </div>
        <div className="header-actions">
          <div className="search-container" style={{ width: '250px', marginRight: '10px' }}>
            <FiSearch className="search-icon" />
            <input type="text" placeholder="Search hotels..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}><FiPlus /> Add Hotel</button>
        </div>
      </div>

      {showAdd && (
        <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '2px dashed var(--primary)' }}>
          <h4 style={{ marginTop: 0 }}>Add New Hotel</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Hotel Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>City *</label>
              <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Star Rating</label>
              <select value={form.star} onChange={e => setForm(f => ({ ...f, star: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="1">1 Star</option>
                <option value="2">2 Star</option>
                <option value="3">3 Star</option>
                <option value="4">4 Star</option>
                <option value="5">5 Star</option>
              </select>
            </div>
            <div style={{ paddingBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_preferred} onChange={e => setForm(f => ({ ...f, is_preferred: e.target.checked }))} />
                Preferred Partner
              </label>
            </div>
          </div>
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving}><FiCheck /> {saving ? 'Saving...' : 'Save'}</button>
            <button className="btn btn-outline" onClick={() => setShowAdd(false)}><FiX /> Cancel</button>
          </div>
        </div>
      )}

      <div className="table-container card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Hotel Name</th>
              <th>Location</th>
              <th>Star Category</th>
              <th>Preferred Partner</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>}
            {!loading && filteredHotels.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No hotels found.</td></tr>
            )}
            {filteredHotels.map(h => (
              <tr key={h.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 32, height: 32, background: '#F3F4F6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}><FiHome /></div>
                    <strong>{h.name}</strong>
                  </div>
                </td>
                <td><FiMapPin style={{ marginRight: 4, color: 'var(--text-muted)' }} />{h.city}</td>
                <td>
                  <div style={{ color: '#F59E0B', display: 'flex', gap: 2 }}>
                    {[...Array(parseInt(h.star || 3))].map((_, i) => <FiStar key={i} />)}
                  </div>
                </td>
                <td>{h.is_preferred ? <span className="badge new">Yes</span> : 'No'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-icon" onClick={() => alert('Edit not implemented')}><FiEdit2 /></button>
                    <button className="btn-icon text-danger" onClick={() => handleDelete(h.id)}><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageHotels;
