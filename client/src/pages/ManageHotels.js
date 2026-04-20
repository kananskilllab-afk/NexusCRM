import React, { useState } from 'react';
import { useLeads } from '../context/LeadContext';
import { FiPlus, FiHome, FiStar, FiMapPin, FiSearch, FiTrash2, FiEdit2 } from 'react-icons/fi';

const ManageHotels = () => {
  const { state } = useLeads();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHotels = (state.hotelsMaster || []).filter(h => 
    h.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="lead-list-page">
      <div className="page-header">
        <div className="header-left">
          <h1>Hotel Catalog</h1>
          <p className="text-secondary">{state.hotelsMaster?.length} partner hotels registered.</p>
        </div>
        <div className="header-actions">
          <div className="search-container" style={{ width: '250px', marginRight: '10px' }}>
            <FiSearch className="search-icon" />
            <input type="text" placeholder="Search hotels..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <button className="btn btn-primary"><FiPlus /> Add Hotel</button>
        </div>
      </div>

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
                    {[...Array(parseInt(h.star))].map((_, i) => <FiStar key={i} />)}
                  </div>
                </td>
                <td><span className="badge new">Yes</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-icon"><FiEdit2 /></button>
                    <button className="btn-icon text-danger"><FiTrash2 /></button>
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
