import React, { useState, useEffect } from 'react';
import { useLeads } from '../context/LeadContext';
import { api } from '../services/api';
import { 
  FiUser, FiMail, FiEye, FiEyeOff, FiCheck 
} from 'react-icons/fi';

const Profile = () => {
  const { state, dispatch } = useLeads();
  const currentUser = state.currentUser;
  const isSuperAdmin = currentUser?.role === 'Super Admin';

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

  const [showAccountPass, setShowAccountPass] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const names = (currentUser.name || '').split(' ');
      setFormData({
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        email: currentUser.email || '',
        password: '',
        role: currentUser.role || 'Viewer',
        status: currentUser.status || 'Active',
        mobile: currentUser.mobile || '',
        area: currentUser.area || '',
        assigned_to: currentUser.assigned_to || '',
        smtp_host: currentUser.smtp_host || '',
        smtp_port: currentUser.smtp_port || '',
        smtp_user: currentUser.smtp_user || '',
        smtp_pass: currentUser.smtp_pass || '',
        email_signature: currentUser.email_signature || '',
        profile_image: currentUser.profile_image || '',
        sig_name: currentUser.signature_fields?.name || '',
        sig_title: currentUser.signature_fields?.title || '',
        sig_company: currentUser.signature_fields?.company || '',
        sig_website: currentUser.signature_fields?.website || '',
        sig_phone: currentUser.signature_fields?.phone || '',
        sig_logo: currentUser.signature_fields?.logo || '',
        sig_linkedin: currentUser.signature_fields?.linkedin || ''
      });
    }
  }, [currentUser]);

  // Handle signature HTML auto generation for live preview
  const generateSignatureHtml = () => {
    const sigName = formData.sig_name || `${formData.firstName} ${formData.lastName}`.trim();
    const sigTitle = formData.sig_title || '';
    const sigCompany = formData.sig_company || '';
    const sigWebsite = formData.sig_website || '';
    const sigPhone = formData.sig_phone || '';
    const sigLogo = formData.sig_logo || '';
    const sigLinkedin = formData.sig_linkedin || '';

    if (!sigName && !sigTitle && !sigPhone && !sigCompany) {
      return '';
    }

    let html = `<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 15px; display: flex; gap: 15px; align-items: center;">`;
    if (sigLogo) {
      html += `<img src="${sigLogo}" alt="${sigCompany || 'Logo'}" style="max-height: 60px; max-width: 120px; border-radius: 4px; object-fit: contain;" />`;
    }
    html += `<div>`;
    html += `<strong style="font-size: 1rem; color: #1d4ed8;">${sigName}</strong><br/>`;
    if (sigTitle || sigCompany) {
      html += `<span style="font-size: 0.85rem; color: #666; font-weight: 500;">${sigTitle}</span>`;
      if (sigTitle && sigCompany) html += ` | `;
      if (sigCompany) html += `<span style="font-size: 0.85rem; color: #666;">${sigCompany}</span>`;
      html += `<br/>`;
    }
    html += `<span style="font-size: 0.8rem; color: #888;">`;
    const details = [];
    if (sigPhone) details.push(`Direct: ${sigPhone}`);
    if (sigWebsite) details.push(`<a href="${sigWebsite}" style="color: #3b82f6; text-decoration: none;" target="_blank">${sigWebsite.replace(/^https?:\/\//, '')}</a>`);
    if (sigLinkedin) details.push(`<a href="${sigLinkedin}" style="color: #3b82f6; text-decoration: none;" target="_blank">LinkedIn</a>`);
    html += details.join(' | ');
    html += `</span></div></div>`;
    return html;
  };

  const previewHtml = generateSignatureHtml() || formData.email_signature;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    
    setSaving(true);
    const generatedHtml = generateSignatureHtml();

    const payload = {
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      mobile: formData.mobile,
      area: formData.area,
      smtp_host: formData.smtp_host,
      smtp_port: formData.smtp_port ? parseInt(formData.smtp_port) : undefined,
      smtp_user: formData.smtp_user,
      smtp_pass: formData.smtp_pass,
      email_signature: generatedHtml,
      profile_image: formData.profile_image,
      signature_fields: {
        name: formData.sig_name,
        title: formData.sig_title,
        company: formData.sig_company,
        website: formData.sig_website,
        phone: formData.sig_phone,
        logo: formData.sig_logo,
        linkedin: formData.sig_linkedin
      }
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    try {
      const updatedUser = await api.updateProfile(payload);
      dispatch({ 
        type: 'LOGIN', 
        payload: { token: state.token, user: updatedUser } 
      });
      
      // Update state in localStorage manually to persist across refreshes
      const stateStr = localStorage.getItem('nexusCRM_State_v2');
      if (stateStr) {
        const parsed = JSON.parse(stateStr);
        parsed.user = updatedUser;
        localStorage.setItem('nexusCRM_State_v2', JSON.stringify(parsed));
      }

      alert('Profile updated successfully');
      setFormData(prev => ({ ...prev, password: '' }));
    } catch (err) {
      alert(err.message);
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: '30px', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '20px', background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)', color: 'white' }}>
        {currentUser?.profile_image ? (
          <img 
            src={currentUser.profile_image} 
            alt="Avatar" 
            style={{
              width: '95px',
              height: '95px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid rgba(255,255,255,0.5)',
              boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
            }} 
          />
        ) : (
          <div style={{
            width: '95px',
            height: '95px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            fontWeight: 'bold',
            border: '3px solid rgba(255,255,255,0.5)'
          }}>
            {currentUser?.name?.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>{currentUser?.name}</h2>
          <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '0.95rem' }}>{currentUser?.role} &bull; {currentUser?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        
        {/* Section: Personal Info */}
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiUser /> Personal Information
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label>First Name</label>
              <input 
                type="text" 
                value={formData.firstName} 
                disabled={!isSuperAdmin}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input 
                type="text" 
                value={formData.lastName} 
                disabled={!isSuperAdmin}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label>Email ID</label>
              <input 
                type="email" 
                value={formData.email} 
                disabled
                style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
              />
            </div>
            <div className="form-group">
              <label>Mobile Number</label>
              <input 
                type="text" 
                value={formData.mobile} 
                disabled={!isSuperAdmin}
                onChange={e => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Role</label>
              <input 
                type="text" 
                value={formData.role} 
                disabled
                style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
              />
            </div>
            <div className="form-group">
              <label>Area</label>
              <input 
                type="text" 
                value={formData.area} 
                disabled={!isSuperAdmin}
                onChange={e => setFormData({ ...formData, area: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Profile Photo URL</label>
              <input 
                type="text" 
                placeholder="e.g. https://domain.com/photo.jpg"
                value={formData.profile_image} 
                disabled={!isSuperAdmin}
                onChange={e => setFormData({ ...formData, profile_image: e.target.value })}
              />
            </div>
          </div>

          {isSuperAdmin && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
              <div className="form-group" style={{ maxWidth: '400px' }}>
                <label>Change Password (leave blank to keep current)</label>
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <input 
                    type={showAccountPass ? "text" : "password"} 
                    value={formData.password} 
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
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
            </div>
          )}
        </div>

        {/* Section: SMTP Settings */}
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiMail /> SMTP Configuration
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 20px 0' }}>
            Credentials used to dispatch automated system and manual client emails from your address.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label>SMTP Host</label>
              <input 
                type="text" 
                placeholder="smtp.gmail.com"
                value={formData.smtp_host} 
                disabled={!isSuperAdmin}
                onChange={e => setFormData({ ...formData, smtp_host: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>SMTP Port</label>
              <input 
                type="number" 
                placeholder="587"
                value={formData.smtp_port} 
                disabled={!isSuperAdmin}
                onChange={e => setFormData({ ...formData, smtp_port: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>SMTP Username / Email</label>
              <input 
                type="text" 
                placeholder="user@company.com"
                value={formData.smtp_user} 
                disabled={!isSuperAdmin}
                onChange={e => setFormData({ ...formData, smtp_user: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>SMTP Password</label>
              <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                <input 
                  type={showSmtpPass ? "text" : "password"} 
                  placeholder={formData.smtp_pass ? "••••••••••••••••" : "Not configured"}
                  value={formData.smtp_pass} 
                  disabled={!isSuperAdmin}
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
          {isSuperAdmin && (
            <div style={{ marginTop: '12px' }}>
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
          )}
          </div>
        </div>

        {/* Section: Signature Builder */}
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiCheck /> Email Signature Settings
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 20px 0' }}>
            Define signature details. The system generates a beautiful, responsive HTML structure automatically.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label>Signature Display Name</label>
              <input 
                type="text" 
                placeholder="e.g. Sachin More"
                value={formData.sig_name} 
                disabled={!isSuperAdmin}
                onChange={e => setFormData({ ...formData, sig_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Job Title / Designation</label>
              <input 
                type="text" 
                placeholder="e.g. Ops Staff"
                value={formData.sig_title} 
                disabled={!isSuperAdmin}
                onChange={e => setFormData({ ...formData, sig_title: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label>Company Name</label>
              <input 
                type="text" 
                placeholder="e.g. Kanan.co"
                value={formData.sig_company} 
                disabled={!isSuperAdmin}
                onChange={e => setFormData({ ...formData, sig_company: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Company Website URL</label>
              <input 
                type="text" 
                placeholder="e.g. https://kanan.co"
                value={formData.sig_website} 
                disabled={!isSuperAdmin}
                onChange={e => setFormData({ ...formData, sig_website: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label>Direct Phone Number</label>
              <input 
                type="text" 
                placeholder="e.g. +91 99999 99999"
                value={formData.sig_phone} 
                disabled={!isSuperAdmin}
                onChange={e => setFormData({ ...formData, sig_phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Logo / Avatar URL</label>
              <input 
                type="text" 
                placeholder="e.g. https://kanan.co/logo.png"
                value={formData.sig_logo} 
                disabled={!isSuperAdmin}
                onChange={e => setFormData({ ...formData, sig_logo: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label>LinkedIn URL</label>
            <input 
              type="text" 
              placeholder="e.g. https://linkedin.com/in/username"
              value={formData.sig_linkedin} 
              disabled={!isSuperAdmin}
              onChange={e => setFormData({ ...formData, sig_linkedin: e.target.value })}
            />
          </div>

          {/* Signature Live Preview */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Signature Live Preview</h4>
            <div 
              style={{ 
                padding: '16px', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                background: '#f8fafc',
                minHeight: '60px'
              }}
              dangerouslySetInnerHTML={{ __html: previewHtml || '<i style="color:var(--text-secondary)">No signature generated. Fill details above to preview.</i>' }}
            />
          </div>
        </div>

        {/* Action Button */}
        {isSuperAdmin && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={saving}
              style={{ padding: '10px 24px', fontWeight: 'bold' }}
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Profile;
