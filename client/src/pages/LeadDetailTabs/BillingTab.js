import React, { useState } from 'react';
import { FiPlus, FiTrash2, FiFileText, FiDollarSign, FiCalendar } from 'react-icons/fi';
import { useLeads } from '../../context/LeadContext';

const BillingTab = ({ lead }) => {
  const { dispatch } = useLeads();
  const [isAdding, setIsAdding] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [newItem, setNewItem] = useState({ description: '', qty: 1, price: 0, tax: 5 });
  const [payForm, setPayForm] = useState({ amount: '', method: 'Bank Transfer', reference: '', note: '' });

  const billing = lead.billing || { items: [], payments: [], paymentSchedule: [] };
  const items = billing.items || [];
  const payments = billing.payments || [];
  const schedule = billing.paymentSchedule || [];

  const subtotal = items.reduce((acc, item) => acc + (item.qty * item.price), 0);
  const totalTax = items.reduce((acc, item) => acc + (item.qty * item.price * (item.tax || 0) / 100), 0);
  const grandTotal = subtotal + totalTax;
  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const balanceDue = grandTotal - totalPaid;

  const updateItems = (newItems) => {
    dispatch({ type: 'UPDATE_BILLING', payload: { leadId: lead.id, billingData: { items: newItems } } });
  };

  const addItem = () => {
    if (!newItem.description) return;
    updateItems([...items, { ...newItem, id: Date.now() }]);
    setNewItem({ description: '', qty: 1, price: 0, tax: 5 });
    setIsAdding(false);
  };

  const removeItem = (id) => updateItems(items.filter(item => item.id !== id));

  const addPayment = () => {
    if (!payForm.amount) return;
    dispatch({ type: 'ADD_PAYMENT', payload: { leadId: lead.id, payment: payForm } });
    setPayForm({ amount: '', method: 'Bank Transfer', reference: '', note: '' });
    setShowPayForm(false);
  };

  return (
    <div className="tab-content billing-tab">
      {/* Financial Summary */}
      <div className="billing-header">
        <div className="billing-stats">
          <div className="stat-box">
            <label>Total Invoiced</label>
            <h3>₹{grandTotal.toLocaleString()}</h3>
          </div>
          <div className="stat-box">
            <label>Paid Amount</label>
            <h3 className="text-success">₹{totalPaid.toLocaleString()}</h3>
          </div>
          <div className="stat-box">
            <label>Balance Due</label>
            <h3 className={balanceDue > 0 ? 'text-danger' : 'text-success'}>₹{balanceDue.toLocaleString()}</h3>
          </div>
        </div>
        <div className="billing-actions">
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}><FiFileText /> Print Invoice</button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowPayForm(!showPayForm)}><FiDollarSign /> Record Payment</button>
        </div>
      </div>

      {/* Record Payment Form */}
      {showPayForm && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h4 style={{ marginBottom: '1rem' }}>Record Payment</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>Amount (₹)*</label>
              <input type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>Method</label>
              <select value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <option>Bank Transfer</option><option>UPI</option><option>Cash</option><option>Credit Card</option><option>Cheque</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>Reference/TXN ID</label>
              <input type="text" value={payForm.reference} onChange={e => setPayForm({ ...payForm, reference: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={addPayment}>Save Payment</button>
          </div>
        </div>
      )}

      {/* Line Items */}
      <div className="card invoice-builder" style={{ marginTop: '1rem' }}>
        <div className="section-header">
          <h3>Billing Items ({items.length})</h3>
          <button className="btn-text" onClick={() => setIsAdding(true)}><FiPlus /> Add Service</button>
        </div>
        <table className="billing-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Tax</th><th>Total</th><th></th></tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td>{item.qty}</td>
                <td>₹{item.price.toLocaleString()}</td>
                <td>{item.tax}%</td>
                <td>₹{(item.qty * item.price * (1 + (item.tax || 0) / 100)).toLocaleString()}</td>
                <td><button className="btn-icon text-muted" onClick={() => removeItem(item.id)}><FiTrash2 /></button></td>
              </tr>
            ))}
            {isAdding && (
              <tr>
                <td><input type="text" placeholder="Description" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} style={{ padding: '6px', border: '1px solid var(--border-color)', borderRadius: '4px', width: '100%' }} /></td>
                <td><input type="number" value={newItem.qty} onChange={e => setNewItem({ ...newItem, qty: parseInt(e.target.value) || 0 })} style={{ padding: '6px', border: '1px solid var(--border-color)', borderRadius: '4px', width: '60px' }} /></td>
                <td><input type="number" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: parseInt(e.target.value) || 0 })} style={{ padding: '6px', border: '1px solid var(--border-color)', borderRadius: '4px', width: '100px' }} /></td>
                <td><input type="number" value={newItem.tax} onChange={e => setNewItem({ ...newItem, tax: parseInt(e.target.value) || 0 })} style={{ padding: '6px', border: '1px solid var(--border-color)', borderRadius: '4px', width: '60px' }} /></td>
                <td colSpan="2" style={{ display: 'flex', gap: '4px' }}>
                  <button className="btn btn-primary btn-sm" onClick={addItem}>Add</button>
                  <button className="btn btn-outline btn-sm" onClick={() => setIsAdding(false)}>✕</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="billing-footer">
          <div className="totals">
            <div className="row"><span>Subtotal:</span><span>₹{subtotal.toLocaleString()}</span></div>
            <div className="row"><span>Tax:</span><span>₹{totalTax.toLocaleString()}</span></div>
            <div className="row grand-total"><span>Grand Total:</span><span>₹{grandTotal.toLocaleString()}</span></div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '1rem' }}><FiDollarSign /> Payment History ({payments.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: 'var(--bg-main)', textAlign: 'left' }}><th style={{ padding: 8 }}>Date</th><th style={{ padding: 8 }}>Amount</th><th style={{ padding: 8 }}>Method</th><th style={{ padding: 8 }}>Reference</th></tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                  <td style={{ padding: 8, fontSize: '0.85rem' }}>{new Date(p.date).toLocaleDateString()}</td>
                  <td style={{ padding: 8, fontWeight: 600, color: 'var(--status-booked)' }}>₹{Number(p.amount).toLocaleString()}</td>
                  <td style={{ padding: 8 }}>{p.method}</td>
                  <td style={{ padding: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.reference || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Schedule */}
      {schedule.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '1rem' }}><FiCalendar /> Payment Schedule</h3>
          {schedule.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--divider)' }}>
              <div>
                <p style={{ fontWeight: 500 }}>₹{s.amount.toLocaleString()}</p>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Due: {new Date(s.dueDate).toLocaleDateString()}</span>
              </div>
              <span className={`badge ${s.status === 'Paid' ? 'new' : 'working'}`}>{s.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BillingTab;
