import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiCheck, FiX, FiFileText, FiPercent } from 'react-icons/fi';
import { voyageApi } from '../../../services/voyageApi';
import { api } from '../../../services/api';

const SupplierContracts = () => {
  const [contracts, setContracts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    supplier_id: '', name: '', net_rate_multiplier: '1.0', commission_override_pct: '', markup_floor_pct: '', valid_from: '', valid_until: '', notes: ''
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [c, s] = await Promise.all([
          voyageApi.getContracts().catch(() => []),
          api.getSuppliers().catch(() => []),
        ]);
        setContracts(c);
        setSuppliers(s);
      } catch (_) {}
      setLoading(false);
    };
    load();
  }, []);

  const handleAdd = async () => {
    if (!form.supplier_id) return alert('Please select a supplier.');
    if (!form.name) return alert('Contract name is required.');
    setSaving(true);
    try {
      await voyageApi.createContract({
        ...form,
        net_rate_multiplier: parseFloat(form.net_rate_multiplier) || 1.0,
        commission_override_pct: form.commission_override_pct ? parseFloat(form.commission_override_pct) : undefined,
        markup_floor_pct: form.markup_floor_pct ? parseFloat(form.markup_floor_pct) : undefined
      });
      const updated = await voyageApi.getContracts();
      setContracts(updated);
      setShowAdd(false);
      setForm({ supplier_id: '', name: '', net_rate_multiplier: '1.0', commission_override_pct: '', markup_floor_pct: '', valid_from: '', valid_until: '', notes: '' });
    } catch (e) {
      alert(e.message || 'Failed to create contract');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contract?')) return;
    try {
      await voyageApi.deleteContract(id);
      setContracts(prev => prev.filter(c => c.id !== id));
    } catch (e) { alert(e.message); }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Supplier Contracts</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>Manage commission overrides, net-rate multipliers, and markup floor rules.</p>
        </div>
        <button id="btn-add-contract" className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}><FiPlus /> New Contract</button>
      </div>

      {showAdd && (
        <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '2px dashed var(--primary)' }}>
          <h4 style={{ marginTop: 0 }}>Create Contract</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Supplier *</label>
              <select value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="">— Select Supplier —</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.service_type || 'General'})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Contract Name *</label>
              <input type="text" placeholder="e.g. Emirates Q3 2026" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Net Rate Multiplier</label>
              <input type="number" step="0.01" value={form.net_rate_multiplier} onChange={e => setForm(f => ({ ...f, net_rate_multiplier: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Commission Override %</label>
              <input type="number" step="0.1" placeholder="e.g. 12.5" value={form.commission_override_pct} onChange={e => setForm(f => ({ ...f, commission_override_pct: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Markup Floor %</label>
              <input type="number" step="0.1" placeholder="e.g. 5" value={form.markup_floor_pct} onChange={e => setForm(f => ({ ...f, markup_floor_pct: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Valid From</label>
              <input type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Valid Until</label>
              <input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional terms or notes..." rows={2} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving}><FiCheck /> {saving ? 'Saving…' : 'Save'}</button>
            <button className="btn btn-outline" onClick={() => setShowAdd(false)}><FiX /> Cancel</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="leads-table">
          <thead>
            <tr>
              <th>Contract Name</th>
              <th>Supplier</th>
              <th>Net Rate ×</th>
              <th>Comm. Override %</th>
              <th>Markup Floor %</th>
              <th>Validity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#999' }}>Loading…</td></tr>
            )}
            {contracts.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 'bold' }}><FiFileText style={{ marginRight: 6, color: 'var(--primary)' }} />{c.name}</td>
                <td>{c.supplier} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({c.supplier_type})</span></td>
                <td style={{ fontFamily: 'monospace' }}>{c.net_rate_multiplier}×</td>
                <td style={{ fontWeight: 'bold', color: c.commission_override_pct ? 'var(--primary)' : '#999' }}>
                  {c.commission_override_pct != null ? <><FiPercent size={12} /> {c.commission_override_pct}%</> : '—'}
                </td>
                <td>{c.markup_floor_pct != null ? `${c.markup_floor_pct}%` : '—'}</td>
                <td style={{ fontSize: '0.85rem' }}>
                  {c.valid_from && c.valid_until ? `${c.valid_from} → ${c.valid_until}` : c.valid_from || '—'}
                </td>
                <td><span className={`badge badge-${c.is_active ? 'success' : 'warning'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <button className="btn btn-outline btn-sm" onClick={() => handleDelete(c.id)} style={{ color: '#ef4444' }}><FiTrash2 /></button>
                </td>
              </tr>
            ))}
            {contracts.length === 0 && !loading && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No contracts found. Create your first supplier contract above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupplierContracts;
