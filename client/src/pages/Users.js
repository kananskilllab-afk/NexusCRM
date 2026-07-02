import React, { useState, useEffect } from 'react';
import { useLeads, ROLE_HIERARCHY } from '../context/LeadContext';
import { api } from '../services/api';
import { 
  FiPlus, FiUser, FiMail, FiShield, FiTrash2, FiEdit2, FiLock, 
  FiAlertTriangle, FiChevronDown, FiChevronUp, FiUsers, FiSettings,
  FiFileText, FiCheckSquare, FiLogOut, FiEye, FiEyeOff, FiX
} from 'react-icons/fi';
import './Users.css';

const Users = () => {
  const { state, dispatch } = useLeads();
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showAccountPass, setShowAccountPass] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showDetailsSmtpPass, setShowDetailsSmtpPass] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    info: true,
    access: true,
    reports: true,
    logout: true
  });
  const [isEditingPermissions, setIsEditingPermissions] = useState(false);
  const [tempPermissions, setTempPermissions] = useState({ access: [], reports: [] });

  const handleEditPermissions = () => {
    setTempPermissions({ 
      access: selectedUser?.access_control || ['Billing', 'Invoice', 'Voucher', 'Supplier', 'All Contact', 'Reports'], 
      reports: selectedUser?.allow_reports || ['Lead Wise', 'Lead Created Wise', 'Purchase Report', 'Supplier Paid Report', 'Customer Payment Report', 'Sale Report', 'Bill Payment Reminder Report', 'Cancel Refund', 'Birthday and Anniversary Report']
    });
    setIsEditingPermissions(true);
  };

  const handleSavePermissions = async () => {
    try {
      const updated = await api.updateUser(selectedUser.id, { 
        access_control: tempPermissions.access, 
        allow_reports: tempPermissions.reports 
      });
      dispatch({ type: 'UPDATE_USER', payload: { id: selectedUser.id, data: updated } });
      setIsEditingPermissions(false);
      alert('Permissions saved successfully');
    } catch (err) {
      alert(err.message || 'Failed to save permissions');
    }
  };

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Viewer',
    status: 'Active',
    mobile: '',
    area: '',
    assigned_to: '',
    smtp_host: '',
    smtp_port: '',
    smtp_user: '',
    smtp_pass: '',
    email_signature: '',
    profile_image: '',
    sig_name: '',
    sig_title: '',
    sig_company: '',
    sig_website: '',
    sig_phone: '',
    sig_logo: '',
    sig_linkedin: ''
  });

  useEffect(() => {
    const fetchUsers = async () => {
      dispatch({ type: 'FETCH_START' });
      try {
        const users = await api.getUsers();
        dispatch({ type: 'SET_USERS', payload: users });
      } catch (err) {
        dispatch({ type: 'FETCH_ERROR', payload: err.message });
      }
    };
    fetchUsers();
  }, [dispatch]);

  const isSuperAdmin = state.currentUser?.role === 'Super Admin';

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'Viewer',
      status: 'Active',
      mobile: '',
      area: '',
      assigned_to: '',
      smtp_host: '',
      smtp_port: '',
      smtp_user: '',
      smtp_pass: '',
      email_signature: '',
      profile_image: '',
      sig_name: '',
      sig_title: '',
      sig_company: '',
      sig_website: '',
      sig_phone: '',
      sig_logo: '',
      sig_linkedin: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (user) => {
    setIsEditMode(true);
    const names = (user.name || '').split(' ');
    setFormData({
      firstName: names[0] || '',
      lastName: names.slice(1).join(' ') || '',
      email: user.email || '',
      password: '',
      role: user.role || 'Viewer',
      status: user.status || 'Active',
      mobile: user.mobile || '',
      area: user.area || '',
      assigned_to: user.assigned_to || '',
      smtp_host: user.smtp_host || '',
      smtp_port: user.smtp_port || '',
      smtp_user: user.smtp_user || '',
      smtp_pass: user.smtp_pass || '',
      email_signature: user.email_signature || '',
      profile_image: user.profile_image || '',
      sig_name: user.signature_fields?.name || '',
      sig_title: user.signature_fields?.title || '',
      sig_company: user.signature_fields?.company || '',
      sig_website: user.signature_fields?.website || '',
      sig_phone: user.signature_fields?.phone || '',
      sig_logo: user.signature_fields?.logo || '',
      sig_linkedin: user.signature_fields?.linkedin || ''
    });
    setEditingUserId(user.id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.email) {
      alert('First Name and Email are required.');
      return;
    }
    if (!isEditMode && !formData.password) {
      alert('Password is required for a new user.');
      return;
    }

    // Generate premium HTML signature dynamically from structured inputs
    const sigName = formData.sig_name || `${formData.firstName} ${formData.lastName}`.trim();
    const sigTitle = formData.sig_title || '';
    const sigCompany = formData.sig_company || '';
    const sigWebsite = formData.sig_website || '';
    const sigPhone = formData.sig_phone || '';
    const sigLogo = formData.sig_logo || '';
    const sigLinkedin = formData.sig_linkedin || '';

    let generatedHtml = '';
    if (sigName || sigTitle || sigPhone || sigCompany) {
      generatedHtml = `<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 15px; display: flex; gap: 15px; align-items: center;">`;
      if (sigLogo) {
        generatedHtml += `<img src="${sigLogo}" alt="${sigCompany || 'Logo'}" style="max-height: 60px; max-width: 120px; border-radius: 4px; object-fit: contain;" />`;
      }
      generatedHtml += `<div>`;
      generatedHtml += `<strong style="font-size: 1rem; color: #1d4ed8;">${sigName}</strong><br/>`;
      if (sigTitle || sigCompany) {
        generatedHtml += `<span style="font-size: 0.85rem; color: #666; font-weight: 500;">${sigTitle}</span>`;
        if (sigTitle && sigCompany) generatedHtml += ` | `;
        if (sigCompany) generatedHtml += `<span style="font-size: 0.85rem; color: #666;">${sigCompany}</span>`;
        generatedHtml += `<br/>`;
      }
      generatedHtml += `<span style="font-size: 0.8rem; color: #888;">`;
      const details = [];
      if (sigPhone) details.push(`Direct: ${sigPhone}`);
      if (sigWebsite) details.push(`<a href="${sigWebsite}" style="color: #3b82f6; text-decoration: none;" target="_blank">${sigWebsite.replace(/^https?:\/\//, '')}</a>`);
      if (sigLinkedin) details.push(`<a href="${sigLinkedin}" style="color: #3b82f6; text-decoration: none;" target="_blank">LinkedIn</a>`);
      generatedHtml += details.join(' | ');
      generatedHtml += `</span></div></div>`;
    } else {
      generatedHtml = formData.email_signature || '';
    }

    const payload = {
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      email: formData.email,
      role: formData.role,
      status: formData.status,
      mobile: formData.mobile,
      area: formData.area,
      assigned_to: formData.assigned_to,
      smtp_host: formData.smtp_host,
      smtp_port: formData.smtp_port ? parseInt(formData.smtp_port) : undefined,
      smtp_user: formData.smtp_user,
      smtp_pass: formData.smtp_pass,
      email_signature: generatedHtml,
      profile_image: formData.profile_image,
      signature_fields: {
        name: sigName,
        title: sigTitle,
        company: sigCompany,
        website: sigWebsite,
        phone: sigPhone,
        logo: sigLogo,
        linkedin: sigLinkedin
      }
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    dispatch({ type: 'FETCH_START' });
    try {
      if (isEditMode) {
        const updated = await api.updateUser(editingUserId, payload);
        dispatch({ type: 'UPDATE_USER', payload: { id: editingUserId, data: updated } });
        alert('User updated successfully');
      } else {
        const created = await api.createUser(payload);
        dispatch({ type: 'ADD_USER', payload: created });
        alert('User created successfully');
      }
      setShowModal(false);
    } catch (err) {
      dispatch({ type: 'FETCH_ERROR', payload: err.message });
      alert(err.message);
    }
  };

  const handleDeleteUser = async (id) => {
    if (id === state.currentUser?.id) {
      alert('You cannot delete your own account.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this user identity? This action cannot be undone.')) {
      return;
    }
    dispatch({ type: 'FETCH_START' });
    try {
      await api.deleteUser(id);
      dispatch({ type: 'DELETE_USER', payload: id });
      setSelectedUserId(null);
      alert('User deleted successfully');
    } catch (err) {
      dispatch({ type: 'FETCH_ERROR', payload: err.message });
      alert(err.message);
    }
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

  if (selectedUserId && selectedUser && !showModal) {
    return (
      <div className="user-view-container">
        <div className="user-view-header card">
           <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {selectedUser.profile_image ? (
                <img 
                  src={selectedUser.profile_image} 
                  alt="Profile" 
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                />
              ) : (
                <FiUsers size={32} style={{ color: '#666' }} />
              )}
              <div>
                <h3>{selectedUser.name}</h3>
                <p>{selectedUser.role} &bull; {selectedUser.email}</p>
              </div>
           </div>
           <div className="header-actions">
              <button className="btn btn-outline" onClick={() => { setSelectedUserId(null); setIsEditingPermissions(false); }}>Back to List</button>
              {isEditingPermissions ? (
                <>
                  <button className="btn btn-outline" onClick={() => setIsEditingPermissions(false)}>Cancel Permissions</button>
                  <button className="btn btn-primary" onClick={handleSavePermissions}>Save Permissions</button>
                </>
              ) : (
                <>
                  <button className="btn btn-outline" onClick={handleEditPermissions}><FiShield /> Edit Permissions</button>
                  <button className="btn btn-outline" onClick={() => handleOpenEditModal(selectedUser)}><FiEdit2 /> Edit Info</button>
                </>
              )}
           </div>
        </div>

        <div className="user-detail-sections">
           {/* User Information */}
           <div className="section-card card">
              <div className="section-head" onClick={() => toggleSection('info')}>
                 <div className="head-title">
                    <span className="icon-circle"><FiChevronDown /></span>
                    <span className="accent-text">User Information</span>
                 </div>
              </div>
              {expandedSections.info && (
                <div className="section-body info-grid">
                   <div className="info-item"><label>First Name</label><div>{selectedUser.name ? selectedUser.name.split(' ')[0] : '—'}</div></div>
                   <div className="info-item"><label>Last Name</label><div>{selectedUser.name ? selectedUser.name.split(' ').slice(1).join(' ') || '—' : '—'}</div></div>
                   <div className="info-item"><label>Email Id</label><div>{selectedUser.email}</div></div>
                   <div className="info-item"><label>Mobile Number</label><div>{selectedUser.mobile || '—'}</div></div>
                   <div className="info-item"><label>Role</label><div>{selectedUser.role}</div></div>
                   <div className="info-item"><label>Assign To</label><div>{selectedUser.assigned_to || '—'}</div></div>
                   <div className="info-item"><label>Area</label><div>{selectedUser.area || '—'}</div></div>
                   <div className="info-item"><label>SMTP Configuration</label><div>{selectedUser.smtp_user ? `Configured (${selectedUser.smtp_user})` : 'Not Configured (System Default)'}</div></div>
                   <div className="info-item" style={{ gridColumn: 'span 2' }}>
                      <label>Profile Photo</label>
                      {selectedUser.profile_image ? (
                        <div style={{ marginTop: '5px' }}>
                          <img 
                            src={selectedUser.profile_image} 
                            alt="Profile" 
                            style={{ width: '120px', height: '120px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                          />
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', marginTop: '5px' }}>No photo configured.</div>
                      )}
                    </div>
                    {selectedUser.smtp_user && (
                      <>
                        <div className="info-item"><label>SMTP Host</label><div>{selectedUser.smtp_host || '—'}</div></div>
                        <div className="info-item"><label>SMTP Port</label><div>{selectedUser.smtp_port || '—'}</div></div>
                        <div className="info-item"><label>SMTP User</label><div>{selectedUser.smtp_user || '—'}</div></div>
                        <div className="info-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ display: 'block', marginRight: '5px' }}>SMTP Password</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{showDetailsSmtpPass ? (selectedUser.smtp_pass || '—') : '••••••••••••'}</span>
                            <button 
                              type="button" 
                              onClick={() => setShowDetailsSmtpPass(!showDetailsSmtpPass)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                            >
                              {showDetailsSmtpPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                    <div className="info-item" style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                      <label style={{ fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Email Signature</label>
                      <div 
                        style={{ 
                          padding: '12px', 
                          border: '1px solid var(--divider)', 
                          borderRadius: '6px', 
                          background: 'rgba(0,0,0,0.02)', 
                          fontFamily: 'var(--font-mono, monospace)', 
                          fontSize: '0.85rem', 
                          whiteSpace: 'pre-wrap', 
                          marginTop: '5px',
                          color: 'var(--text-primary)'
                        }}
                        dangerouslySetInnerHTML={{ __html: selectedUser.email_signature || '<i style="color:var(--text-secondary)">No signature configured.</i>' }}
                      />
                    </div>
                </div>
              )}
           </div>

           {/* Access Control */}
           <div className="section-card card">
              <div className="section-head" onClick={() => toggleSection('access')}>
                 <div className="head-title">
                    <span className="icon-circle"><FiChevronDown /></span>
                    <span className="accent-text">Access Control</span>
                 </div>
              </div>
              {expandedSections.access && (
                <div className="section-body permissions-grid">
                   {[
                     'Billing', 'Invoice', 'Voucher', 
                     'Supplier', 'All Contact', 'Reports'
                   ].map(p => {
                     const isChecked = isEditingPermissions 
                        ? tempPermissions.access.includes(p)
                        : (selectedUser.access_control || []).includes(p);
                     return (
                       <div key={p} className="permission-item">
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            disabled={!isEditingPermissions}
                            onChange={(e) => {
                              if (e.target.checked) setTempPermissions(prev => ({ ...prev, access: [...prev.access, p] }));
                              else setTempPermissions(prev => ({ ...prev, access: prev.access.filter(x => x !== p) }));
                            }}
                          />
                          <label>{p}</label>
                       </div>
                     );
                   })}
                </div>
              )}
           </div>

           {/* Allow Reports */}
           <div className="section-card card">
              <div className="section-head" onClick={() => toggleSection('reports')}>
                 <div className="head-title">
                    <span className="icon-circle"><FiChevronDown /></span>
                    <span className="accent-text">Allow Reports</span>
                 </div>
              </div>
              {expandedSections.reports && (
                <div className="section-body permissions-grid-wide">
                   {[
                     'Lead Wise', 'Lead Created Wise', 'Purchase Report',
                     'Supplier Paid Report', 'Customer Payment Report', 'Sale Report',
                     'Bill Payment Reminder Report', 'Profit Loss', 'Cancel Refund',
                     'Birthday and Anniversary Report'
                   ].map(r => {
                     const isChecked = isEditingPermissions 
                        ? tempPermissions.reports.includes(r)
                        : (selectedUser.allow_reports || []).includes(r);
                     return (
                       <div key={r} className={`permission-item ${r === 'Profit Loss' ? 'disabled' : ''}`}>
                          <input 
                            type="checkbox" 
                            checked={r === 'Profit Loss' ? false : isChecked} 
                            disabled={!isEditingPermissions || r === 'Profit Loss'}
                            onChange={(e) => {
                              if (e.target.checked) setTempPermissions(prev => ({ ...prev, reports: [...prev.reports, r] }));
                              else setTempPermissions(prev => ({ ...prev, reports: prev.reports.filter(x => x !== r) }));
                            }}
                          />
                          <label>{r}</label>
                       </div>
                     );
                   })}
                </div>
              )}
           </div>

           {/* Force Logout */}
           <div className="section-card card">
              <div className="section-head" onClick={() => toggleSection('logout')}>
                 <div className="head-title">
                    <span className="icon-circle"><FiChevronDown /></span>
                    <span className="accent-text">Do you want to force logout User?</span>
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
          <p className="text-secondary">{state.users?.length || 0} members in your organization</p>
        </div>
        <div className="header-actions">
           <button className="btn btn-primary" onClick={handleOpenAddModal}><FiPlus /> Add Identity</button>
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
                    {user.profile_image ? (
                      <img 
                        src={user.profile_image} 
                        alt="Avatar" 
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          objectFit: 'cover', 
                          border: '1px solid var(--border-color)' 
                        }} 
                      />
                    ) : (
                      <div className="user-avatar-small">{user.name ? user.name.charAt(0) : 'U'}</div>
                    )}
                    <strong>{user.name}</strong>
                  </div>
                </td>
                <td>{user.email}</td>
                <td><span className="role-chip">{user.role}</span></td>
                <td><span className={`status-dot ${user.status === 'Active' ? 'active' : 'inactive'}`}></span> {user.status}</td>
                <td onClick={e => e.stopPropagation()}>
                   <button className="btn-icon" onClick={() => setSelectedUserId(user.id)}><FiEye /></button>
                   <button className="btn-icon" onClick={() => handleOpenEditModal(user)}><FiEdit2 /></button>
                   <button className="btn-icon text-danger" onClick={() => handleDeleteUser(user.id)}><FiTrash2 /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{isEditMode ? 'Edit User Identity' : 'Add New User'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} autoComplete="off">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input 
                      type="text" 
                      value={formData.firstName} 
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input 
                      type="text" 
                      value={formData.lastName} 
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email ID *</label>
                  <input 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({ ...formData, email: e.target.value })} 
                    required 
                    autoComplete="new-email"
                  />
                </div>

                <div className="form-group">
                  <label>{isEditMode ? 'Password (Leave blank to keep current)' : 'Password *'}</label>
                  <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                    <input 
                      type={showAccountPass ? "text" : "password"} 
                      autoComplete="new-password"
                      value={formData.password} 
                      onChange={e => setFormData({ ...formData, password: e.target.value })} 
                      required={!isEditMode}
                      style={{ width: '100%', paddingRight: '40px' }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowAccountPass(!showAccountPass)}
                      style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                      {showAccountPass ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Role</label>
                    <select 
                      value={formData.role} 
                      onChange={e => setFormData({ ...formData, role: e.target.value })}
                    >
                      {Object.keys(ROLE_HIERARCHY).map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select 
                      value={formData.status} 
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Mobile Number</label>
                    <input 
                      type="text" 
                      value={formData.mobile} 
                      onChange={e => setFormData({ ...formData, mobile: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Area</label>
                    <input 
                      type="text" 
                      value={formData.area} 
                      onChange={e => setFormData({ ...formData, area: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Assign To</label>
                  <select
                    value={formData.assigned_to}
                    onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                  >
                    <option value="">— None —</option>
                    {Array.from(new Set([
                      ...(state.users || []).filter(u => !u.status || u.status === 'Active').map(u => u.name),
                      ...(formData.assigned_to ? [formData.assigned_to] : [])
                    ])).map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ marginTop: '10px' }}>
                   <label>Profile Photo URL</label>
                   <input 
                     type="text" 
                     placeholder="e.g. https://domain.com/photo.jpg"
                     value={formData.profile_image} 
                     onChange={e => setFormData({ ...formData, profile_image: e.target.value })} 
                   />
                </div>

                <div style={{ borderTop: '2px dashed var(--border-color)', margin: '15px 0', paddingTop: '15px' }}>
                  <h4 style={{ fontWeight: 800, marginBottom: '10px' }}>Personal Agent SMTP Settings</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                    Configure credentials to send emails from your personal account. Leave blank to use global settings.
                  </p>
                  <div className="form-row">
                    <div className="form-group">
                      <label>SMTP Host</label>
                      <input 
                        type="text" 
                        placeholder="smtp.gmail.com"
                        value={formData.smtp_host || ''} 
                        onChange={e => setFormData({ ...formData, smtp_host: e.target.value })} 
                      />
                    </div>
                    <div className="form-group">
                      <label>SMTP Port</label>
                      <input 
                        type="number" 
                        placeholder="587"
                        value={formData.smtp_port || ''} 
                        onChange={e => setFormData({ ...formData, smtp_port: e.target.value })} 
                      />
                    </div>
                  </div>
                  <div className="form-row" style={{ marginTop: '10px' }}>
                    <div className="form-group">
                      <label>SMTP Username / Email</label>
                      <input 
                        type="text" 
                        placeholder="agent@company.com"
                        value={formData.smtp_user || ''} 
                        onChange={e => setFormData({ ...formData, smtp_user: e.target.value })} 
                      />
                    </div>
                    <div className="form-group">
                      <label>SMTP Password</label>
                      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <input 
                          type={showSmtpPass ? "text" : "password"} 
                          placeholder="••••••••••••••••"
                          value={formData.smtp_pass || ''} 
                          onChange={e => setFormData({ ...formData, smtp_pass: e.target.value })} 
                          style={{ width: '100%', paddingRight: '40px' }}
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowSmtpPass(!showSmtpPass)}
                          style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                        >
                          {showSmtpPass ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={async () => {
                        if (!formData.smtp_host || !formData.smtp_user || !formData.smtp_pass) {
                          alert('Fill in SMTP Host, Username, and Password before testing.');
                          return;
                        }
                        try {
                          const result = await api.testSmtp({
                            smtp_host: formData.smtp_host,
                            smtp_port: formData.smtp_port,
                            smtp_user: formData.smtp_user,
                            smtp_pass: formData.smtp_pass
                          });
                          alert(result.ok ? `✅ ${result.message}` : `❌ ${result.error}`);
                        } catch (e) {
                          alert('❌ Test failed: ' + e.message);
                        }
                      }}
                    >
                      Test SMTP Connection
                    </button>
                  </div>
                  <div style={{ borderTop: '2px dashed var(--border-color)', margin: '15px 0', paddingTop: '15px' }}>
                    <h4 style={{ fontWeight: 800, marginBottom: '10px' }}>Email Signature Builder</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                      Fill in the fields below. The system will automatically construct a premium HTML signature.
                    </p>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Signature Display Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Sachin More"
                          value={formData.sig_name || ''} 
                          onChange={e => setFormData({ ...formData, sig_name: e.target.value })} 
                        />
                      </div>
                      <div className="form-group">
                        <label>Job Title / Designation</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Ops Staff"
                          value={formData.sig_title || ''} 
                          onChange={e => setFormData({ ...formData, sig_title: e.target.value })} 
                        />
                      </div>
                    </div>
                    <div className="form-row" style={{ marginTop: '10px' }}>
                      <div className="form-group">
                        <label>Company Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Kanan.co"
                          value={formData.sig_company || ''} 
                          onChange={e => setFormData({ ...formData, sig_company: e.target.value })} 
                        />
                      </div>
                      <div className="form-group">
                        <label>Company Website URL</label>
                        <input 
                          type="text" 
                          placeholder="e.g. https://kanan.co"
                          value={formData.sig_website || ''} 
                          onChange={e => setFormData({ ...formData, sig_website: e.target.value })} 
                        />
                      </div>
                    </div>
                    <div className="form-row" style={{ marginTop: '10px' }}>
                      <div className="form-group">
                        <label>Direct Phone / Mobile</label>
                        <input 
                          type="text" 
                          placeholder="e.g. +91 99999 99999"
                          value={formData.sig_phone || ''} 
                          onChange={e => setFormData({ ...formData, sig_phone: e.target.value })} 
                        />
                      </div>
                      <div className="form-group">
                        <label>Logo / Photo Image URL</label>
                        <input 
                          type="text" 
                          placeholder="e.g. https://kanan.co/logo.png"
                          value={formData.sig_logo || ''} 
                          onChange={e => setFormData({ ...formData, sig_logo: e.target.value })} 
                        />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginTop: '10px' }}>
                      <label>LinkedIn Profile URL</label>
                      <input 
                        type="text" 
                        placeholder="e.g. https://linkedin.com/in/username"
                        value={formData.sig_linkedin || ''} 
                        onChange={e => setFormData({ ...formData, sig_linkedin: e.target.value })} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Identity</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
