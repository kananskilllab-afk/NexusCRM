import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiSend, FiMail, FiCheck, FiX, FiEye, FiEdit2, FiLayers } from 'react-icons/fi';
import { voyageApi } from '../../../services/voyageApi';
import { api } from '../../../services/api';
import { useLeads, ROLE_HIERARCHY } from '../../../context/LeadContext';

const CATEGORY_COLORS = {
  confirmation: '#10b981', payment_reminder: '#f59e0b', itinerary: '#3b82f6',
  marketing: '#ec4899', cancellation: '#ef4444', other: '#94a3b8'
};

const EmailManager = () => {
  const { state } = useLeads();
  const userRole = state.currentUser?.role || 'Viewer';
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const signature = state.currentUser?.email_signature;

  const [activeView, setActiveView] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [form, setForm] = useState({ name: '', subject: '', body_html: '', category: 'other' });
  const [sendForm, setSendForm] = useState({ template_id: '', to_email: '', subject: '', booking_id: '' });

  // Filters State
  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [users, setUsers] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const promises = [
          voyageApi.getEmailTemplates(),
          voyageApi.getEmailHistory(),
          api.getLeads().catch(() => [])
        ];
        if (userLevel >= 4) {
          promises.push(voyageApi.getEmailUsers().catch(() => []));
        }
        const results = await Promise.all(promises);
        setTemplates(results[0]);
        setHistory(results[1]);
        setLeads(results[2]);
        if (userLevel >= 4) {
          setUsers(results[3] || []);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [userLevel]);

  const handleCreateTemplate = async () => {
    if (!form.name || !form.subject || !form.body_html) return alert('Name, Subject, and Body are required.');
    try {
      await voyageApi.createEmailTemplate(form);
      const updated = await voyageApi.getEmailTemplates();
      setTemplates(updated);
      setShowAdd(false);
      setForm({ name: '', subject: '', body_html: '', category: 'other' });
    } catch (e) { alert(e.message); }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Delete this email template?')) return;
    try {
      await voyageApi.deleteEmailTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e) { alert(e.message); }
  };

  const handleSendEmail = async () => {
    if (!sendForm.to_email) return alert('Recipient email is required.');
    try {
      const result = await voyageApi.sendEmail({
        template_id: sendForm.template_id,
        to_email: sendForm.to_email,
        subject: sendForm.subject,
        booking_id: sendForm.booking_id || undefined,
        include_signature: true
      });
      alert(result.message);
      const updated = await voyageApi.getEmailHistory();
      setHistory(updated);
      setShowSend(false);
      setSendForm({ template_id: '', to_email: '', subject: '', booking_id: '' });
    } catch (e) { alert(e.message); }
  };

  const STATUS_BADGES = {
    sent: 'success', delivered: 'success', opened: 'info',
    clicked: 'info', queued: 'warning', bounced: 'warning', failed: 'warning'
  };

  // Client-side filtering of loaded history
  const filteredHistory = history.filter(h => {
    if (userLevel >= 4 && filterUser && h.sent_by_id !== filterUser) {
      return false;
    }
    if (filterStatus && h.status !== filterStatus) {
      return false;
    }
    if (filterStartDate && h.created_at < filterStartDate) {
      return false;
    }
    if (filterEndDate && h.created_at > filterEndDate) {
      return false;
    }
    return true;
  });

  // Calculate stats based on active view's filtered items
  const viewHistory = filteredHistory.filter(h => activeView === 'bulk' ? h.is_bulk : !h.is_bulk);
  
  const stats = {
    total: viewHistory.length,
    sent: viewHistory.filter(h => ['sent', 'delivered', 'opened', 'clicked', 'bounced'].includes(h.status)).length,
    delivered: viewHistory.filter(h => ['delivered', 'opened', 'clicked'].includes(h.status)).length,
    opened: viewHistory.filter(h => ['opened', 'clicked'].includes(h.status)).length,
    failed: viewHistory.filter(h => h.status === 'failed').length,
    queued: viewHistory.filter(h => h.status === 'queued').length,
    bounced: viewHistory.filter(h => h.status === 'bounced').length,
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Email Manager</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>Create templates, send emails, and track delivery status.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => setShowSend(!showSend)}><FiSend /> Compose Email</button>
          {userLevel >= 2 && (
            <button className="btn btn-outline" onClick={() => setShowAdd(!showAdd)}><FiPlus /> New Template</button>
          )}
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px' }}>
        {[
          { key: 'templates', label: 'Templates', icon: <FiEdit2 /> }, 
          { key: 'history', label: 'Individual History', icon: <FiMail /> },
          { key: 'bulk', label: 'Bulk Sends', icon: <FiLayers /> }
        ].map((v, idx, arr) => (
          <button key={v.key} onClick={() => setActiveView(v.key)} style={{
            padding: '10px 20px', border: '1px solid var(--border-color)', background: activeView === v.key ? 'var(--primary)' : 'white',
            color: activeView === v.key ? 'white' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            borderRadius: idx === 0 ? '6px 0 0 6px' : idx === arr.length - 1 ? '0 6px 6px 0' : '0', 
            fontWeight: activeView === v.key ? 'bold' : 'normal'
          }}>{v.icon} {v.label}</button>
        ))}
      </div>

      {/* Compose Email modal */}
      {showSend && (
        <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '2px dashed #10b981' }}>
          <h4 style={{ marginTop: 0 }}><FiSend style={{ marginRight: 6 }} /> Compose & Send Email</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Associate Lead (optional)</label>
              <select value={sendForm.booking_id} onChange={e => {
                const selectedLead = leads.find(l => l.id === e.target.value);
                setSendForm(f => ({
                  ...f,
                  booking_id: e.target.value,
                  to_email: selectedLead ? selectedLead.email : f.to_email
                }));
              }} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="">— None —</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.first_name} {l.last_name} ({l.id})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Template (optional)</label>
              <select value={sendForm.template_id} onChange={e => {
                const tpl = templates.find(t => t.id === e.target.value);
                setSendForm(f => ({ ...f, template_id: e.target.value, subject: tpl ? tpl.subject : f.subject }));
              }} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="">— None (Custom) —</option>
                {templates.filter(t => t.is_active).map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Recipient Email *</label>
              <input type="email" placeholder="client@example.com" value={sendForm.to_email} onChange={e => setSendForm(f => ({ ...f, to_email: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Subject</label>
              <input type="text" placeholder="Booking Confirmation" value={sendForm.subject} onChange={e => setSendForm(f => ({ ...f, subject: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            {signature && (
              <div style={{ gridColumn: 'span 3', marginTop: '10px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Email Signature (Always Included)
                </label>
                <div 
                  style={{ 
                    marginTop: '8px', 
                    padding: '10px 14px', 
                    borderRadius: '6px', 
                    border: '1px solid var(--border-color)', 
                    background: 'rgba(0,0,0,0.01)', 
                    fontSize: '0.8rem', 
                    color: 'var(--text-secondary)',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap'
                  }}
                  dangerouslySetInnerHTML={{ __html: signature }}
                />
              </div>
            )}
          </div>
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={handleSendEmail}><FiSend /> Send Now</button>
            <button className="btn btn-outline" onClick={() => setShowSend(false)}><FiX /> Cancel</button>
          </div>
        </div>
      )}

      {/* Add Template form */}
      {showAdd && (
        <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '2px dashed var(--primary)' }}>
          <h4 style={{ marginTop: 0 }}>Create Email Template</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Template Name *</label>
              <input type="text" placeholder="e.g. Booking Confirmation" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                {['confirmation','payment_reminder','itinerary','marketing','cancellation','other'].map(c => (
                  <option key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Subject *</label>
              <input type="text" placeholder="Your Booking is Confirmed — {{booking_ref}}" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Body (HTML)</label>
              <textarea value={form.body_html} onChange={e => setForm(f => ({ ...f, body_html: e.target.value }))} placeholder="<p>Dear {{first_name}}, your booking has been confirmed...</p>" rows={6} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'monospace', fontSize: '0.85rem' }} />
            </div>
          </div>
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={handleCreateTemplate}><FiCheck /> Save Template</button>
            <button className="btn btn-outline" onClick={() => setShowAdd(false)}><FiX /> Cancel</button>
          </div>
        </div>
      )}

      {/* Analytics Dashboard + Filters Panel (for history and bulk views) */}
      {(activeView === 'history' || activeView === 'bulk') && (
        <>
          {/* Filters Card */}
          <div className="card" style={{ padding: '20px', marginBottom: '20px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end' }}>
              
              {/* User Filter (Super Admin / Admin only) */}
              {userLevel >= 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px', flex: '1 1 0' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Filter by User</label>
                  <select 
                    value={filterUser} 
                    onChange={e => setFilterUser(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', width: '100%' }}
                  >
                    <option value="">All Users</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px', flex: '1 1 0' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Filter by Status</label>
                <select 
                  value={filterStatus} 
                  onChange={e => setFilterStatus(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', width: '100%' }}
                >
                  <option value="">All Statuses</option>
                  <option value="sent">Sent</option>
                  <option value="delivered">Delivered</option>
                  <option value="opened">Opened</option>
                  <option value="queued">Queued</option>
                  <option value="bounced">Bounced</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Start Date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '160px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>From Date</label>
                <input 
                  type="date" 
                  value={filterStartDate} 
                  onChange={e => setFilterStartDate(e.target.value)}
                  style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', width: '100%' }}
                />
              </div>

              {/* End Date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '160px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>To Date</label>
                <input 
                  type="date" 
                  value={filterEndDate} 
                  onChange={e => setFilterEndDate(e.target.value)}
                  style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', width: '100%' }}
                />
              </div>

              {/* Clear filters */}
              {(filterUser || filterStatus || filterStartDate || filterEndDate) && (
                <button 
                  className="btn btn-outline" 
                  onClick={() => {
                    setFilterUser('');
                    setFilterStatus('');
                    setFilterStartDate('');
                    setFilterEndDate('');
                  }}
                  style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FiX /> Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Stats Dashboard Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {[
              { label: 'Total Sent', value: stats.sent, emoji: '📤', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', text: '#1e3a8a', key: 'sent' },
              { label: 'Delivered', value: stats.delivered, emoji: '✅', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', text: '#064e3b', key: 'delivered' },
              { label: 'Opened', value: stats.opened, emoji: '👁️', color: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc', text: '#083344', key: 'opened' },
              { label: 'Failed', value: stats.failed, emoji: '❌', color: '#ef4444', bg: '#fef2f2', border: '#fecaca', text: '#7f1d1d', key: 'failed' },
              { label: 'Queued', value: stats.queued, emoji: '⏳', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', text: '#78350f', key: 'queued' },
              { label: 'Bounced', value: stats.bounced, emoji: '🔙', color: '#6366f1', bg: '#e0e7ff', border: '#c7d2fe', text: '#312e81', key: 'bounced' }
            ].map((card, index) => (
              <div 
                key={card.key}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: card.bg,
                  border: `1px solid ${hoveredCard === index ? card.color : card.border}`,
                  boxShadow: hoveredCard === index 
                    ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                    : '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transform: hoveredCard === index ? 'translateY(-2px)' : 'none',
                  transition: 'all 0.2s ease-in-out',
                  cursor: 'default',
                }}
              >
                <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{card.emoji}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: card.text }}>{card.label}</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: card.color }}>{card.value}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Templates View */}
      {activeView === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
          {templates.map(t => (
            <div key={t.id} className="card" style={{ padding: '20px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '0.7rem', background: (CATEGORY_COLORS[t.category] || '#999') + '20', color: CATEGORY_COLORS[t.category] || '#999', fontWeight: 'bold', textTransform: 'capitalize' }}>
                    {t.category.replace('_', ' ')}
                  </span>
                </div>
                <span className={`badge badge-${t.is_active ? 'success' : 'warning'}`} style={{ fontSize: '0.7rem' }}>{t.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <h4 style={{ margin: '8px 0 4px 0' }}>{t.name}</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 12px 0' }}>Subject: {t.subject}</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-outline btn-sm" onClick={() => setPreviewTemplate(previewTemplate === t.id ? null : t.id)}><FiEye /> {previewTemplate === t.id ? 'Hide' : 'Preview'}</button>
                {userLevel >= 3 && (
                  <button className="btn btn-outline btn-sm" onClick={() => handleDeleteTemplate(t.id)} style={{ color: '#ef4444' }}><FiTrash2 /></button>
                )}
                <button className="btn btn-primary btn-sm" onClick={() => { setSendForm({ template_id: t.id, to_email: '', subject: t.subject, booking_id: '' }); setShowSend(true); }}><FiSend /> Use</button>
              </div>
              {previewTemplate === t.id && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', maxHeight: '200px', overflowY: 'auto' }} dangerouslySetInnerHTML={{ __html: t.body_html }} />
              )}
            </div>
          ))}
          {templates.length === 0 && !loading && (
            <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '50px', color: '#999' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📧</div>
              No email templates yet. Click "New Template" to create your first one.
            </div>
          )}
        </div>
      )}

      {/* Individual History View */}
      {activeView === 'history' && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="leads-table" style={{ width: '100%', minWidth: '950px' }}>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Subject</th>
                <th>Template</th>
                <th>Contact</th>
                <th>Sender</th>
                <th>Status</th>
                <th>Sent At</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.filter(h => !h.is_bulk).map(h => (
                <tr key={h.id} style={{ backgroundColor: h.status === 'failed' ? 'rgba(239, 68, 68, 0.05)' : undefined }}>
                  <td style={{ fontWeight: 'bold' }}><FiMail style={{ marginRight: 6, color: 'var(--primary)' }} />{h.to_email}</td>
                  <td>{h.subject}</td>
                  <td>{h.template || 'Custom'}</td>
                  <td>{h.contact || '—'}</td>
                  <td>
                    <div style={{ fontWeight: '500' }}>{h.sent_by_name || '—'}</div>
                    {h.sent_by && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{h.sent_by}</div>}
                  </td>
                  <td>
                    <span className={`badge badge-${STATUS_BADGES[h.status] || 'warning'}`}>{h.status}</span>
                    {h.status === 'failed' && h.error_message && (
                      <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '4px', maxWidth: '200px', wordBreak: 'break-word', lineHeight: '1.2' }}>
                        {h.error_message}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{h.sent_at ? new Date(h.sent_at).toLocaleString() : h.created_at}</td>
                </tr>
              ))}
              {filteredHistory.filter(h => !h.is_bulk).length === 0 && !loading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '50px', color: '#999' }}>No individual emails sent yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Sends View */}
      {activeView === 'bulk' && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="leads-table" style={{ width: '100%', minWidth: '950px' }}>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Subject</th>
                <th>Template</th>
                <th>Contact</th>
                <th>Sender</th>
                <th>Status</th>
                <th>Sent At</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.filter(h => h.is_bulk).map(h => (
                <tr key={h.id} style={{ backgroundColor: h.status === 'failed' ? 'rgba(239, 68, 68, 0.05)' : undefined }}>
                  <td style={{ fontWeight: 'bold' }}><FiMail style={{ marginRight: 6, color: 'var(--primary)' }} />{h.to_email}</td>
                  <td>{h.subject}</td>
                  <td>{h.template || 'Custom'}</td>
                  <td>{h.contact || '—'}</td>
                  <td>
                    <div style={{ fontWeight: '500' }}>{h.sent_by_name || '—'}</div>
                    {h.sent_by && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{h.sent_by}</div>}
                  </td>
                  <td>
                    <span className={`badge badge-${STATUS_BADGES[h.status] || 'warning'}`}>{h.status}</span>
                    {h.status === 'failed' && h.error_message && (
                      <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '4px', maxWidth: '200px', wordBreak: 'break-word', lineHeight: '1.2' }}>
                        {h.error_message}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{h.sent_at ? new Date(h.sent_at).toLocaleString() : h.created_at}</td>
                </tr>
              ))}
              {filteredHistory.filter(h => h.is_bulk).length === 0 && !loading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '50px', color: '#999' }}>No bulk emails sent yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EmailManager;
