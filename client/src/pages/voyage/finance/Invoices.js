import React, { useState, useEffect } from 'react';
import { FiPlus, FiEye } from 'react-icons/fi';
import { voyageApi } from '../../../services/voyageApi';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    voyageApi.getInvoices()
      .then(data => { setInvoices(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Invoices</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>Track payments and outstanding balances.</p>
        </div>
        <button className="btn btn-primary" onClick={() => alert('Opening Create Invoice Wizard...')}><FiPlus /> Create Invoice</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Collected (This Month)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>₹42,500</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Outstanding Balances</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>₹12,400</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--color-red)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Overdue</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>₹3,100</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="leads-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Client</th>
              <th>Total Amount</th>
              <th>Amount Due</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id}>
                <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{inv.id}</td>
                <td>{inv.client}</td>
                <td>₹{inv.total}</td>
                <td style={{ color: inv.due > 0 ? 'var(--color-red)' : 'var(--color-green)', fontWeight: 'bold' }}>₹{inv.due}</td>
                <td>{inv.dueDate}</td>
                <td><span className={`badge badge-${inv.status === 'Paid' ? 'success' : 'warning'}`}>{inv.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button className="btn btn-outline btn-sm"><FiEye /></button>
                    <button className="btn btn-primary btn-sm" onClick={() => alert('Record Payment flow initializing...')}>Record Payment</button>
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

export default Invoices;
