import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiSend, FiMail, FiCheck, FiX, FiEye, FiEdit2 } from 'react-icons/fi';
import { voyageApi } from '../../../services/voyageApi';

const CATEGORY_COLORS = {
  confirmation: '#10b981', payment_reminder: '#f59e0b', itinerary: '#3b82f6',
  marketing: '#ec4899', cancellation: '#ef4444', other: '#94a3b8'
};

const EmailManager = () => {
  const [activeView, setActiveView] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [form, setForm] = useState({ name: '', subject: '', body_html: '', category: 'other' });
  const [sendForm, setSendForm] = useState({ template_id: '', to_email: '', subject: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const [t, h] = await Promise.all([
          voyageApi.getEmailTemplates(),
          voyageApi.getEmailHistory()
        ]);
        setTemplates(t);
        setHistory(h);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

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
      const result = await voyageApi.sendEmail(sendForm);
      alert(result.message);
      const updated = await voyageApi.getEmailHistory();
      setHistory(updated);
      setShowSend(false);
      setSendForm({ template_id: '', to_email: '', subject: '' });
    } catch (e) { alert(e.message); }
  };

  const STATUS_BADGES = {
    sent: 'success', delivered: 'success', opened: 'info',
    clicked: 'info', queued: 'warning', bounced: 'warning', failed: 'warning'
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
          <button className="btn btn-outline" onClick={() => setShowAdd(!showAdd)}><FiPlus /> New Template</button>
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px' }}>
        {[{ key: 'templates', label: 'Templates', icon: <FiEdit2 /> }, { key: 'history', label: 'Sent History', icon: <FiMail /> }].map(v => (
          <button key={v.key} onClick={() => setActiveView(v.key)} style={{
            padding: '10px 20px', border: '1px solid var(--border-color)', background: activeView === v.key ? 'var(--primary)' : 'white',
            color: activeView === v.key ? 'white' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            borderRadius: v.key === 'templates' ? '6px 0 0 6px' : '0 6px 6px 0', fontWeight: activeView === v.key ? 'bold' : 'normal'
          }}>{v.icon} {v.label}</button>
        ))}
      </div>

      {/* Compose Email modal */}
      {showSend && (
        <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '2px dashed #10b981' }}>
          <h4 style={{ marginTop: 0 }}><FiSend style={{ marginRight: 6 }} /> Compose & Send Email</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Subject</label>
              <input type="text" placeholder="Booking Confirmation" value={sendForm.subject} onChange={e => setSendForm(f => ({ ...f, subject: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
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
                <button className="btn btn-outline btn-sm" onClick={() => handleDeleteTemplate(t.id)} style={{ color: '#ef4444' }}><FiTrash2 /></button>
                <button className="btn btn-primary btn-sm" onClick={() => { setSendForm({ template_id: t.id, to_email: '', subject: t.subject }); setShowSend(true); }}><FiSend /> Use</button>
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

      {/* History View */}
      {activeView === 'history' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="leads-table">
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Subject</th>
                <th>Template</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Sent At</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id}>
                  <td style={{ fontWeight: 'bold' }}><FiMail style={{ marginRight: 6, color: 'var(--primary)' }} />{h.to_email}</td>
                  <td>{h.subject}</td>
                  <td>{h.template || 'Custom'}</td>
                  <td>{h.contact || '—'}</td>
                  <td><span className={`badge badge-${STATUS_BADGES[h.status] || 'warning'}`}>{h.status}</span></td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{h.sent_at ? new Date(h.sent_at).toLocaleString() : h.created_at}</td>
                </tr>
              ))}
              {history.length === 0 && !loading && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '50px', color: '#999' }}>No emails sent yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EmailManager;
