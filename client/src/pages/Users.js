import React, { useState } from 'react';
import { useLeads, ROLE_HIERARCHY } from '../context/LeadContext';
import { 
  FiPlus, FiUser, FiMail, FiShield, FiTrash2, FiEdit2, FiLock, 
  FiAlertTriangle, FiChevronDown, FiChevronUp, FiUsers, FiSettings,
  FiFileText, FiCheckSquare, FiLogOut, FiEye
} from 'react-icons/fi';
import './Users.css';

const Users = () => {
  const { state, dispatch } = useLeads();
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    info: true,
    access: true,
    reports: true,
    logout: true
  });

  const isSuperAdmin = state.currentUser?.role === 'Super Admin';

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!isSuperAdmin) {
    return (
      <div className="access-denied">
          <div className="card text-center">
            <FiAlertTriangle size={48} color="#FF5757" />
            <h2>Access Guarded</h2>
            <p>Only a **Super Admin** can manage users. Please contact your system administrator.</p>
          </div>
      </div>
    );
  }

  const selectedUser = state.users?.find(u => u.id === selectedUserId);

  if (selectedUserId && selectedUser) {
    return (
      <div className="user-view-container">
        <div className="user-view-header card">
           <div className="header-left">
              <FiUsers size={32} style={{ color: '#666' }} />
              <div>
                <h3>View User</h3>
                <p>User are the point of entry for your CRM.</p>
              </div>
           </div>
           <div className="header-actions">
              <button className="btn btn-outline" onClick={() => setSelectedUserId(null)}>Back to List</button>
              <button className="btn btn-outline"><FiEdit2 /> Edit</button>
           </div>
        </div>

        <div className="user-detail-sections">
           {/* User Information */}
           <div className="section-card card">
              <div className="section-head" onClick={() => toggleSection('info')}>
                 <div className="head-title">
                    <span className="icon-circle"><FiChevronDown /></span>
                    <span className="red-text">User Information</span>
                 </div>
              </div>
              {expandedSections.info && (
                <div className="section-body info-grid">
                   <div className="info-item"><label>First Name</label><div>{selectedUser.name.split(' ')[0]}</div></div>
                   <div className="info-item"><label>Last Name</label><div>{selectedUser.name.split(' ')[1] || '—'}</div></div>
                   <div className="info-item"><label>Email Id</label><div>{selectedUser.email}</div></div>
                   <div className="info-item"><label>Mobile Number</label><div>6357334866</div></div>
                   <div className="info-item"><label>Role</label><div>{selectedUser.role}</div></div>
                   <div className="info-item"><label>Assign To</label><div>Vicky ray(admin)</div></div>
                   <div className="info-item"><label>Area</label><div>Vadodara</div></div>
                </div>
              )}
           </div>

           {/* Access Control */}
           <div className="section-card card">
              <div className="section-head" onClick={() => toggleSection('access')}>
                 <div className="head-title">
                    <span className="icon-circle"><FiChevronDown /></span>
                    <span className="red-text">Access Control</span>
                 </div>
              </div>
              {expandedSections.access && (
                <div className="section-body permissions-grid">
                   {[
                     'Billing', 'Invoice', 'Voucher', 
                     'Supplier', 'All Contact', 'Reports'
                   ].map(p => (
                     <div key={p} className="permission-item">
                        <input type="checkbox" defaultChecked />
                        <label>{p}</label>
                     </div>
                   ))}
                </div>
              )}
           </div>

           {/* Allow Reports */}
           <div className="section-card card">
              <div className="section-head" onClick={() => toggleSection('reports')}>
                 <div className="head-title">
                    <span className="icon-circle"><FiChevronDown /></span>
                    <span className="red-text">Allow Reports</span>
                 </div>
              </div>
              {expandedSections.reports && (
                <div className="section-body permissions-grid-wide">
                   {[
                     'Lead Wise', 'Lead Created Wise', 'Purchase Report',
                     'Supplier Paid Report', 'Customer Payment Report', 'Sale Report',
                     'Bill Payment Reminder Report', 'Profit Loss', 'Cancel Refund',
                     'Birthday and Anniversary Report'
                   ].map(r => (
                     <div key={r} className={`permission-item ${r === 'Profit Loss' ? 'disabled' : ''}`}>
                        <input type="checkbox" defaultChecked={r !== 'Profit Loss'} />
                        <label>{r}</label>
                     </div>
                   ))}
                </div>
              )}
           </div>

           {/* Force Logout */}
           <div className="section-card card">
              <div className="section-head" onClick={() => toggleSection('logout')}>
                 <div className="head-title">
                    <span className="icon-circle"><FiChevronDown /></span>
                    <span className="red-text">Do you want to force logout User?</span>
                 </div>
              </div>
              {expandedSections.logout && (
                <div className="section-body force-logout-section">
                   <div className="permission-item">
                      <input type="checkbox" />
                      <label>Logout</label>
                   </div>
                   <div className="info-item" style={{ marginTop: '15px' }}>
                      <label>Suspended</label>
                      <div style={{ padding: 0 }}>No</div>
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <div className="header-left">
          <h1>Users: Team Access Control</h1>
          <p className="text-secondary">{state.users?.length} members in your organization</p>
        </div>
        <div className="header-actions">
           <button className="btn btn-primary" onClick={() => {}}><FiPlus /> Add Identity</button>
        </div>
      </div>

      <div className="table-container card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {(state.users || []).map(user => (
              <tr key={user.id} onClick={() => setSelectedUserId(user.id)} className="clickable-row">
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="user-avatar-small">{user.name.charAt(0)}</div>
                    <strong>{user.name}</strong>
                  </div>
                </td>
                <td>{user.email}</td>
                <td><span className="role-chip">{user.role}</span></td>
                <td><span className={`status-dot ${user.status === 'Active' ? 'active' : 'inactive'}`}></span> {user.status}</td>
                <td onClick={e => e.stopPropagation()}>
                   <button className="btn-icon" onClick={() => setSelectedUserId(user.id)}><FiEye /></button>
                   <button className="btn-icon"><FiEdit2 /></button>
                   <button className="btn-icon text-danger"><FiTrash2 /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
