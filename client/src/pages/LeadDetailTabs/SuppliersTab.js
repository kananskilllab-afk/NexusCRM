import React, { useState, useEffect } from 'react';
import { useLeads } from '../../context/LeadContext';
import { api } from '../../services/api';
import { FiPlus, FiTruck, FiStar } from 'react-icons/fi';

const SuppliersTab = ({ lead }) => {
  const { state, dispatch } = useLeads();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ supplierId: '', serviceType: '', rate: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const allSuppliers = state.suppliers || [];
  const assigned = lead.assignedSuppliers || [];

  const loadSuppliers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const s = await api.getSuppliers();
      if (Array.isArray(s)) {
        dispatch({ type: 'SET_SUPPLIERS', payload: s });
      }
    } catch (e) {
      setErrorMsg(e.message || 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!state.suppliers || state.suppliers.length === 0) {
      loadSuppliers();
    }
  }, [state.suppliers]);

  const handleAssign = async () => {
    if (!form.supplierId || !form.serviceType) return;
    const supplier = allSuppliers.find(s => s.id === form.supplierId || s._id === form.supplierId);
    setSubmitting(true);
    setErrorMsg('');

    const payload = {
      leadId: lead.id,
      supplier_id: form.supplierId,
      supplier_name: supplier?.name || form.supplierId,
      service_type: form.serviceType,
      rate: Number(form.rate) || 0,
      notes: form.notes
    };

    try {
      await api.assignSupplier(lead.id, payload);
      dispatch({
        type: 'ASSIGN_SUPPLIER',
        payload
      });
      setForm({ supplierId: '', serviceType: '', rate: '', notes: '' });
      setShowForm(false);
    } catch (e) {
      // Fallback local dispatch if offline/non-blocking
      dispatch({
        type: 'ASSIGN_SUPPLIER',
        payload
      });
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tab-content">
      <div className="card">
        <div className="section-header">
          <h3><FiTruck /> Assigned Suppliers ({assigned.length})</h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {allSuppliers.length === 0 && (
              <button className="btn-text" onClick={loadSuppliers} style={{ fontSize: '0.8rem' }}>
                {loading ? 'Loading suppliers...' : '↻ Reload Suppliers'}
              </button>
            )}
            <button className="btn-text" onClick={() => setShowForm(!showForm)}><FiPlus /> Assign Supplier</button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ background: 'var(--state-error-bg)', color: 'var(--state-error-text)', padding: '8px 12px', borderRadius: 6, fontSize: '0.82rem', marginBottom: 12 }}>
            {errorMsg}
          </div>
        )}

        {showForm && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '1rem 0', borderBottom: '1px solid var(--divider)' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>
                Supplier* {allSuppliers.length > 0 ? `(${allSuppliers.length} available)` : ''}
              </label>
              <select 
                value={form.supplierId} 
                onChange={e => setForm({ ...form, supplierId: e.target.value })} 
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <option value="">{loading ? 'Loading supplier partners...' : allSuppliers.length === 0 ? 'No suppliers loaded (click reload)' : 'Select Supplier'}</option>
                {allSuppliers.map(s => {
                  const typeLabel = s.service_type || s.product_name || s.type || 'Partner';
                  return (
                    <option key={s.id || s._id} value={s.id || s._id}>
                      {s.name} ({typeLabel})
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>Service Type*</label>
              <select value={form.serviceType} onChange={e => setForm({ ...form, serviceType: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <option value="">Select Service</option>
                <option>Hotel</option><option>Flight</option><option>Visa</option><option>Transport</option><option>Activity</option><option>Passport Assistance</option><option>Other</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>Agreed Rate (₹)</label>
              <input type="number" placeholder="0" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', alignItems: 'end' }}>
              <input type="text" placeholder="Notes (e.g. Flight booking PNR, Booking voucher #)..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
              <button className="btn btn-primary btn-sm" disabled={submitting || !form.supplierId || !form.serviceType} onClick={handleAssign}>
                {submitting ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          {assigned.map((a, idx) => {
            const supId = a.supplier_id || a.supplierId;
            const sup = allSuppliers.find(s => s.id === supId);
            const supplierDisplayName = a.supplier_name || a.supplierName || sup?.name || supId || 'Supplier';
            const serviceType = a.service_type || a.serviceType || 'Service';
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', background: 'var(--bg-main)', borderRadius: '8px', marginBottom: '8px' }}>
                <div style={{ width: 44, height: 44, background: 'var(--primary-light)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><FiTruck size={20} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <p style={{ fontWeight: 600 }}>{supplierDisplayName}</p>
                    {sup?.rating && <span style={{ fontSize: '0.8rem', color: '#F59E0B' }}><FiStar /> {sup.rating}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>{serviceType}</span>
                    {a.rate && <span>Rate: ₹{Number(a.rate).toLocaleString()}</span>}
                    {a.notes && <span>— {a.notes}</span>}
                  </div>
                </div>
                <span className="badge new">{sup?.type || sup?.category || 'Partner'}</span>
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
