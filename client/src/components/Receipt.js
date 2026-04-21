import React, { useMemo } from 'react';
import { FiDownload, FiPrinter, FiX } from 'react-icons/fi';
import './Receipt.css';

const Receipt = ({ lead, onClose }) => {
  const billing = lead.billing || { items: [], payments: [], paymentSchedule: [] };
  const items = billing.items || [];
  const payments = billing.payments || [];
  
  // Memoize to prevent ID changing on every re-render (Requirement Fix)
  const receiptId = useMemo(() => `REC-${Math.floor(100000 + Math.random() * 900000)}`, []);
  const receiptDate = useMemo(() => new Date().toLocaleDateString(), []);

  const subtotal = items.reduce((acc, item) => acc + (item.qty * item.price), 0);
  const totalTax = items.reduce((acc, item) => acc + (item.qty * item.price * (item.tax || 0) / 100), 0);
  const grandTotal = subtotal + totalTax;
  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const balanceDue = grandTotal - totalPaid;

  const getStatus = () => {
    if (balanceDue <= 0) return 'PAID';
    if (totalPaid > 0) return 'PARTIALLY PAID';
    return 'PENDING';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="receipt-overlay no-print">
      <div className="receipt-modal">
        <div className="receipt-actions no-print">
          <button className="btn btn-primary" onClick={handlePrint}>
            <FiPrinter /> Print / Save PDF
          </button>
          <button className="btn btn-outline" onClick={onClose}>
            <FiX /> Close
          </button>
        </div>

        <div className="receipt-container" id="printable-receipt">
          <div className="receipt-header">
            <div className="company-branding">
              <h2>Nexus <span>CRM</span></h2>
              <div className="company-details">
                <p>123 Travel Tower, Business Hub</p>
                <p>New Delhi, Delhi 110001</p>
                <p><strong>GSTIN:</strong> 07AAAAA0000A1Z5</p>
                <p><strong>Support:</strong> +91 98765 43210</p>
              </div>
            </div>
            <div className="receipt-title">
              <h1>RECEIPT</h1>
              <div className="receipt-meta">
                <p>Date: {receiptDate}</p>
                <p>Receipt #: {receiptId}</p>
                <p>Lead ID: {lead.id}</p>
              </div>
            </div>
          </div>

          <div className="receipt-info-grid">
            <div className="info-section">
              <h4>Billed To</h4>
              <div className="info-content">
                <p><strong>{lead.first_name} {lead.last_name}</strong></p>
                <p>{lead.email}</p>
                <p>{lead.mobile}</p>
                <p>Destination: {lead.destination}</p>
              </div>
            </div>
            <div className="info-section">
              <h4>Payment Summary</h4>
              <div className="info-content">
                <p>Status: <strong>{getStatus()}</strong></p>
                <p>Method: {payments[0]?.method || 'Multiple'}</p>
                <p>Ref: {payments[0]?.reference || 'N/A'}</p>
              </div>
            </div>
          </div>

          <table className="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Unit Price</th>
                <th className="text-right">Tax</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.description}</td>
                  <td className="text-right">{item.qty}</td>
                  <td className="text-right">₹{item.price.toLocaleString()}</td>
                  <td className="text-right">{item.tax}%</td>
                  <td className="text-right">₹{(item.qty * item.price * (1 + (item.tax || 0) / 100)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="receipt-footer">
            <div className={`status-watermark ${getStatus().toLowerCase().replace(' ', '-')}`}>
              {getStatus()}
            </div>
            
            <div className="totals-section">
              <div className="total-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="total-row">
                <span>Total Tax</span>
                <span>₹{totalTax.toLocaleString()}</span>
              </div>
              <div className="total-row grand-total">
                <span>Grand Total</span>
                <span>₹{grandTotal.toLocaleString()}</span>
              </div>
              <div className="total-row" style={{ color: '#10b981', fontWeight: 600 }}>
                <span>Amount Paid</span>
                <span>₹{totalPaid.toLocaleString()}</span>
              </div>
              <div className="total-row" style={{ color: balanceDue > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                <span>Balance Due</span>
                <span>₹{Math.max(0, balanceDue).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="notes-section">
            <h5>Terms & Conditions</h5>
            <p>1. This is a computer generated receipt and does not require a physical signature.</p>
            <p>2. Please quote the Lead ID and Receipt Number for all future correspondence.</p>
            <p>3. Payments are subject to realization. Cancellation policies apply as per supplier terms.</p>
            <p style={{ marginTop: '15px', textAlign: 'center', fontWeight: 600, color: '#1e293b' }}>
              Thank you for choosing Nexus CRM. Have a safe and wonderful trip!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
