import React, { useState } from 'react';
import { FiSettings, FiUsers, FiLink, FiCreditCard, FiShield } from 'react-icons/fi';

const SettingsDashboard = () => {
  const [activeTab, setActiveTab] = useState('General');

  const TABS = [
    { id: 'General', icon: <FiSettings /> },
    { id: 'Team', icon: <FiUsers /> },
    { id: 'Integrations', icon: <FiLink /> },
    { id: 'Billing', icon: <FiCreditCard /> },
    { id: 'Security', icon: <FiShield /> },
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px' }}>Agency Settings</h2>
      
      <div style={{ display: 'flex', gap: '30px' }}>
        <div style={{ width: '250px' }}>
          <div className="card" style={{ padding: '10px' }}>
            {TABS.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{ 
                  width: '100%', padding: '12px 15px', textAlign: 'left', background: activeTab === tab.id ? 'var(--primary-light)' : 'none',
                  border: 'none', borderRadius: '6px', color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-main)',
                  fontWeight: activeTab === tab.id ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'
                }}
              >
                {tab.icon} {tab.id}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div className="card" style={{ minHeight: '400px' }}>
             {activeTab === 'General' && (
               <div>
                 <h3>Agency Details</h3>
                 <div className="form-group"><label>Agency Name</label><input type="text" className="form-control" defaultValue="Nexus Travels" /></div>
                 <div className="form-group"><label>Primary Email</label><input type="email" className="form-control" defaultValue="hello@nexustravels.com" /></div>
                 <button className="btn btn-primary mt-3">Save Changes</button>
               </div>
             )}
             {activeTab === 'Team' && (
               <div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                   <h3>Team Management</h3>
                   <button className="btn btn-primary btn-sm">Invite Member</button>
                 </div>
                 <table className="leads-table">
                   <thead><tr><th>Name</th><th>Role</th><th>Status</th></tr></thead>
                   <tbody>
                     <tr><td>Bhargav</td><td>Owner</td><td><span className="badge badge-success">Active</span></td></tr>
                     <tr><td>Sarah</td><td>Sr. Agent</td><td><span className="badge badge-success">Active</span></td></tr>
                   </tbody>
                 </table>
               </div>
             )}
             {activeTab === 'Integrations' && (
               <div>
                 <h3>API Integrations</h3>
                 <div style={{ border: '1px solid var(--border-color)', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0' }}>TBO Holidays API</h4>
                      <div style={{ fontSize: '0.85rem', color: '#10b981' }}>Connected</div>
                    </div>
                    <button className="btn btn-outline btn-sm">Configure</button>
                 </div>
               </div>
             )}
             {activeTab === 'Security' && (
               <div>
                 <h3>Security & Audit</h3>
                 <p>Configure Role-Based Access Control (RBAC), view audit logs, and manage GDPR requests.</p>
                 <button className="btn btn-outline mt-2">Download Audit Log</button>
               </div>
             )}
             {activeTab === 'Billing' && (
               <div>
                 <h3>Subscription</h3>
                 <div className="card" style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary)' }}>Enterprise Plan</h4>
                    <p style={{ margin: 0 }}>₹299/mo. Next billing date: Nov 1, 2025</p>
                 </div>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsDashboard;
