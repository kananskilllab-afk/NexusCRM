import React, { useState, useEffect } from 'react';
import { voyageApi } from '../../../services/voyageApi';

const Commissions = () => {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    voyageApi.getCommissions()
      .then(data => { setCommissions(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Supplier Commissions</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>Track and reconcile agent commissions.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="leads-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Booking Ref</th>
              <th>Expected Comm.</th>
              <th>Received Comm.</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((c, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 'bold' }}>{c.supplier}</td>
                <td>{c.booking}</td>
                <td>₹{c.expected}</td>
                <td style={{ color: c.received === c.expected ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>₹{c.received}</td>
                <td><span className={`badge badge-${c.status === 'Settled' ? 'success' : 'warning'}`}>{c.status}</span></td>
                <td>
                  {c.status === 'Pending' && <button className="btn btn-primary btn-sm">Mark as Received</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Commissions;
