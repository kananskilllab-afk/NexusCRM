import React, { useState } from 'react';
import { useLeads } from '../context/LeadContext';
import { FiPlus, FiPackage, FiMapPin, FiClock, FiDollarSign, FiTrash2, FiEdit2 } from 'react-icons/fi';

const ManagePackages = () => {
  const { state } = useLeads();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="lead-list-page">
      <div className="page-header">
        <div className="header-left">
          <h1>Package Master</h1>
          <p className="text-secondary">Manage pre-defined holiday itineraries and fixed departures.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><FiPlus /> Create Package</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {(state.packages || []).map(pkg => (
          <div key={pkg.id} className="card package-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ background: 'var(--primary)', height: '100px', padding: '15px', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <FiPackage size={32} style={{ opacity: 0.3, position: 'absolute', top: 10, right: 10 }} />
              <h3 style={{ margin: 0 }}>{pkg.name}</h3>
            </div>
            <div style={{ padding: '15px' }}>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span><FiClock /> {pkg.days} Days</span>
                <span><FiMapPin /> Multiple Cities</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '15px', height: '40px', overflow: 'hidden' }}>{pkg.inclusions}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.1rem' }}>₹{pkg.price.toLocaleString()}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-icon"><FiEdit2 /></button>
                  <button className="btn-icon text-danger"><FiTrash2 /></button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Example Empty State / Placeholder for adding */}
        <div 
          onClick={() => setShowModal(true)}
          style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '240px', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          <FiPlus size={32} />
          <p>Add New Package</p>
        </div>
      </div>
      
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '500px' }}>
            <div className="modal-header"><h3>New Holiday Package</h3><button className="close-btn" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-form">
              <div className="form-group"><label>Package Name</label><input type="text" placeholder="e.g. Exotic Thailand" /></div>
              <div className="form-row">
                <div className="form-group"><label>Duration (Days)</label><input type="number" defaultValue="5" /></div>
                <div className="form-group"><label>Base Price (₹)</label><input type="number" placeholder="50000" /></div>
              </div>
              <div className="form-group"><label>Inclusions</label><textarea placeholder="Hotels, Breakfast, Sightseeing..." style={{ height: '80px' }}></textarea></div>
              <div className="modal-footer"><button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary">Save Package</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePackages;
