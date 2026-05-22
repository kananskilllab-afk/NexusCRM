import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPhone, FiMail, FiMapPin, FiBriefcase } from 'react-icons/fi';

const ContactDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  
  const TABS = ['Overview', 'Bookings', 'Communication', 'Notes', 'Files', 'Preferences'];

  return (
    <div style={{ padding: '20px' }}>
      <button onClick={() => navigate('/customers')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '20px' }}>
        <FiArrowLeft /> Back to Contacts
      </button>

      <div className="card" style={{ padding: '30px', marginBottom: '20px', display: 'flex', gap: '30px', alignItems: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
          J
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h1 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
               John Doe
               <span style={{ fontSize: '0.8rem', background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '4px' }}>Score: 85</span>
               <span style={{ fontSize: '0.8rem', background: '#d1fae5', color: '#065f46', padding: '4px 8px', borderRadius: '4px' }}>VIP</span>
             </h1>
             <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-outline"><FiMail /> Email</button>
                <button className="btn btn-primary">New Booking</button>
             </div>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FiPhone /> +1 234 567 890</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FiMail /> john@example.com</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FiMapPin /> New York, USA</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FiBriefcase /> Acme Corp</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
         <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 20px' }}>
           {TABS.map(tab => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               style={{ 
                 padding: '15px 20px', 
                 background: 'none', 
                 border: 'none', 
                 borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                 color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
                 fontWeight: activeTab === tab ? 'bold' : 'normal',
                 cursor: 'pointer'
               }}
             >
               {tab}
             </button>
           ))}
         </div>
         
         <div style={{ padding: '30px' }}>
           {activeTab === 'Overview' && (
             <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                <div>
                   <h3>Recent Activity</h3>
                   <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                     <li style={{ padding: '15px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '15px' }}>
                       <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiMail /></div>
                       <div>
                         <div style={{ fontWeight: 'bold' }}>Quote Sent: Bali Honeymoon</div>
                         <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Yesterday at 2:30 PM by Sarah</div>
                       </div>
                     </li>
                   </ul>
                </div>
                <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
                   <h3 style={{ marginTop: 0 }}>Quick Stats</h3>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>Total Bookings:</span> <strong>3</strong></div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>Total Value:</span> <strong>₹12,500</strong></div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>Last Travel:</span> <strong>Oct 2025</strong></div>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Loyalty Points:</span> <strong>450 pts</strong></div>
                </div>
             </div>
           )}
           {activeTab !== 'Overview' && (
             <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                {activeTab} Module implementation in progress.
             </div>
           )}
         </div>
      </div>
    </div>
  );
};

export default ContactDetail;
