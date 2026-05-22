import React, { useState, useEffect } from 'react';
import { FiPlus, FiDownload, FiSend, FiEye } from 'react-icons/fi';
import { voyageApi } from '../../../services/voyageApi';

const Quotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    voyageApi.getQuotes()
      .then(data => { setQuotes(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Quotes</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>Manage and send pricing proposals to clients.</p>
        </div>
        <button className="btn btn-primary" onClick={() => alert('Opening Create Quote Wizard...')}><FiPlus /> Create Quote</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="leads-table">
          <thead>
            <tr>
              <th>Quote #</th>
              <th>Booking Ref</th>
              <th>Client</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map(q => (
              <tr key={q.id}>
                <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{q.id}</td>
                <td>{q.booking}</td>
                <td>{q.client}</td>
                <td style={{ fontWeight: 'bold' }}>₹{q.amount}</td>
                <td>{q.date}</td>
                <td><span className={`badge badge-${q.status === 'Sent' ? 'info' : 'warning'}`}>{q.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button className="btn btn-outline btn-sm"><FiEye /></button>
                    <button className="btn btn-outline btn-sm" title="Download PDF" onClick={() => alert('Downloading PDF...')}><FiDownload /></button>
                    <button className="btn btn-primary btn-sm" title="Send to Client" onClick={() => alert('Opening Email sender...')}><FiSend /></button>
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

export default Quotes;
