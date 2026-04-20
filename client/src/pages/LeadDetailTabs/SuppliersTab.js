import React, { useState } from 'react';
import { useLeads } from '../../context/LeadContext';
import { FiPlus, FiTruck, FiStar } from 'react-icons/fi';

const SuppliersTab = ({ lead }) => {
  const { state, dispatch } = useLeads();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ supplierId: '', serviceType: '', rate: '', notes: '' });

  const allSuppliers = state.suppliers || [];
  const assigned = lead.assignedSuppliers || [];

  const handleAssign = () => {
    if (!form.supplierId || !form.serviceType) return;
    const supplier = allSuppliers.find(s => s.id === form.supplierId);
    dispatch({
      type: 'ASSIGN_SUPPLIER',
      payload: { leadId: lead.id, supplierId: form.supplierId, supplierName: supplier?.name, serviceType: form.serviceType, rate: form.rate, notes: form.notes }
    });
    setForm({ supplierId: '', serviceType: '', rate: '', notes: '' });
    setShowForm(false);
  };

  return (
    <div className="tab-content">
      <div className="card">
        <div className="section-header">
          <h3><FiTruck /> Assigned Suppliers ({assigned.length})</h3>
          <button className="btn-text" onClick={() => setShowForm(!showForm)}><FiPlus /> Assign Supplier</button>
        </div>

        {showForm && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '1rem 0', borderBottom: '1px solid var(--divider)' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>Supplier*</label>
              <select value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <option value="">Select Supplier</option>
                {allSuppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>Service Type*</label>
              <select value={form.serviceType} onChange={e => setForm({ ...form, serviceType: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <option value="">Select</option>
                <option>Hotel</option><option>Flight</option><option>Visa</option><option>Transport</option><option>Activity</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>Agreed Rate (₹)</label>
              <input type="number" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', alignItems: 'end' }}>
              <input type="text" placeholder="Notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
              <button className="btn btn-primary btn-sm" onClick={handleAssign}>Assign</button>
            </div>
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          {assigned.map((a, idx) => {
            const sup = allSuppliers.find(s => s.id === a.supplierId);
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', background: 'var(--bg-main)', borderRadius: '8px', marginBottom: '8px' }}>
                <div style={{ width: 44, height: 44, background: 'var(--primary-light)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><FiTruck size={20} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <p style={{ fontWeight: 600 }}>{sup?.name || a.supplierId}</p>
                    {sup?.rating && <span style={{ fontSize: '0.8rem', color: '#F59E0B' }}><FiStar /> {sup.rating}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>{a.serviceType}</span>
                    {a.rate && <span>Rate: ₹{Number(a.rate).toLocaleString()}</span>}
                    {a.notes && <span>— {a.notes}</span>}
                  </div>
                </div>
                <span className="badge new">{sup?.type || 'Supplier'}</span>
              </div>
            );
          })}
          {assigned.length === 0 && <p className="text-muted" style={{ textAlign: 'center', padding: '2rem 0' }}>No suppliers assigned to this lead yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default SuppliersTab;
