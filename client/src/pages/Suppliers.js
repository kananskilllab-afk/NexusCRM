import React, { useState, useEffect, useMemo } from 'react';
import { useLeads } from '../context/LeadContext';
import { api } from '../services/api';
import { voyageApi } from '../services/voyageApi';
import { 
  FiPlus, FiEdit2, FiPhone, FiMail, FiStar, FiTruck, FiSearch, 
  FiTrash2, FiUser, FiMapPin, FiBriefcase, FiX, FiCheckCircle 
} from 'react-icons/fi';

const SendEmailModal = ({ onClose, supplier }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [ccEmails, setCcEmails] = useState([]);
  const [customCc, setCustomCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [customTo, setCustomTo] = useState('');

  const primaryEmail = supplier.email || supplier.contact_email;

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const list = await voyageApi.getEmailTemplates();
        setTemplates(list.filter(t => t.is_active));
      } catch (err) {
        console.error('Failed to load email templates', err);
      }
    };
    loadTemplates();

    if (primaryEmail) {
      setToEmail(primaryEmail);
    } else if (supplier.email_contacts && supplier.email_contacts.length > 0) {
      setToEmail(supplier.email_contacts[0].email);
    }
  }, [supplier, primaryEmail]);

  const handleTemplateChange = (templateId) => {
    setSelectedTemplate(templateId);
    if (!templateId) {
      setSubject('');
      setBody('');
      return;
    }
    const tpl = templates.find(t => t.id === templateId);
    if (tpl) {
      setSubject(tpl.subject || '');
      setBody(tpl.body_html || '');
    }
  };

  const handleCcToggle = (email) => {
    setCcEmails(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const finalTo = toEmail === 'custom' ? customTo : toEmail;
    if (!finalTo) return alert('Recipient email is required');
    
    // Combine checked CC options with any typed custom CC emails
    const allCc = [...ccEmails];
    if (customCc.trim()) {
      customCc.split(',').forEach(email => {
        const trimmed = email.trim();
        if (trimmed && !allCc.includes(trimmed)) allCc.push(trimmed);
      });
    }

    setSending(true);
    try {
      await voyageApi.sendEmail({
        to_email: finalTo,
        cc_emails: allCc.filter(e => e !== finalTo).join(','),
        subject,
        custom_body: body,
        template_id: selectedTemplate || undefined
      });
      alert('Email sent successfully!');
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content card" style={{ maxWidth: '650px', padding: '24px' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--divider)', paddingBottom: '10px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}><FiMail /> Send Email to {supplier.name}</h2>
          <button className="close-btn" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* Recipient Choice */}
          <div className="form-group">
            <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Send To (Recipient)*</label>
            <select 
              className="form-control" 
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }}
              value={toEmail} 
              onChange={e => setToEmail(e.target.value)}
              required
            >
              <option value="">— Select Recipient —</option>
              {primaryEmail && (
                <option value={primaryEmail}>Primary: {primaryEmail}</option>
              )}
              {supplier.email_contacts?.map((c, idx) => (
                <option key={c._id || `${c.email}-${idx}`} value={c.email}>{c.name} ({c.designation || 'N/A'}) — {c.email}</option>
              ))}
              <option value="custom">Type Custom Email...</option>
            </select>
          </div>

          {toEmail === 'custom' && (
            <div className="form-group">
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Custom Email Address</label>
              <input 
                type="email" 
                className="form-control" 
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }}
                placeholder="supplier@example.com"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                required
              />
            </div>
          )}

          {/* CC Choices (Checked List) */}
          <div className="form-group" style={{ border: '1px solid var(--divider)', padding: '12px', borderRadius: '6px', background: 'rgba(0,0,0,0.01)' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>CC Recipients</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto', marginBottom: '10px' }}>
              {primaryEmail && (
                <label key="primary-cc" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={ccEmails.includes(primaryEmail)} 
                    onChange={() => handleCcToggle(primaryEmail)}
                  />
                  <span>Primary: {primaryEmail}</span>
                </label>
              )}
              {supplier.email_contacts?.map((c, idx) => (
                <label key={c._id || `${c.email}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={ccEmails.includes(c.email)} 
                    onChange={() => handleCcToggle(c.email)}
                  />
                  <span><strong>{c.name}</strong> ({c.designation || 'N/A'}) — {c.email}</span>
                </label>
              ))}
              {(!primaryEmail && (!supplier.email_contacts || supplier.email_contacts.length === 0)) && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No contacts found to CC.</span>
              )}
            </div>
            
            {/* Custom CC input */}
            <div style={{ borderTop: '1px dashed var(--divider)', paddingTop: '10px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Custom CC Emails (comma-separated)</label>
              <input 
                type="text" 
                className="form-control" 
                style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid var(--divider)', fontSize: '0.8rem' }}
                placeholder="agent1@company.com, manager@company.com"
                value={customCc}
                onChange={e => setCustomCc(e.target.value)}
              />
            </div>
          </div>

          {/* Template Choice */}
          <div className="form-group">
            <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Email Template (Optional)</label>
            <select 
              className="form-control" 
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }}
              value={selectedTemplate} 
              onChange={e => handleTemplateChange(e.target.value)}
            >
              <option value="">— Custom (No Template) —</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="form-group">
            <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Subject</label>
            <input 
              type="text" 
              className="form-control" 
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }}
              placeholder="Enter subject" 
              value={subject} 
              onChange={e => setSubject(e.target.value)} 
              required
            />
          </div>

          {/* Body */}
          <div className="form-group">
            <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Message Body (HTML supported)</label>
            <textarea 
              className="form-control" 
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)', minHeight: '120px' }}
              placeholder="Type your message here..." 
              value={body} 
              onChange={e => setBody(e.target.value)} 
              required
            />
          </div>

          {/* Footer */}
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={sending}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SupplierModal = ({ onClose, onSave, supplier }) => {
  const [form, setForm] = useState({
    name: '',
    product_name: '',
    service_type: 'Hotel & Resorts',
    phone: '',
    email: '',
    primary_contact_name: '',
    gst: '',
    payment_terms: 'Net 30',
    commission_pct: 0,
    address: '',
    address_1: '',
    address_2: '',
    address_3: '',
    address_4: '',
    city: '',
    phone_contacts: [],
    email_contacts: []
  });

  const [newPhoneContact, setNewPhoneContact] = useState({ phone: '', name: '', designation: '' });
  const [newEmailContact, setNewEmailContact] = useState({ email: '', name: '', designation: '' });

  const TYPE_OPTIONS = [
    'Hotel & Resorts', 'Airline', 'Domestic Tours', 'International Tours', 
    'Flight Consolidator', 'Visa Agency', 'Transport', 'Activity Provider', 'Other'
  ];

  useEffect(() => {
    if (supplier) {
      const getTermsString = (val) => {
        if (val === 0 || val === '0') return 'Prepaid';
        if (val === 15 || val === '15') return 'Net 15';
        if (val === 30 || val === '30') return 'Net 30';
        if (val === 45 || val === '45') return 'Net 45';
        return val || 'Net 30';
      };

      setForm({
        name: supplier.name || '',
        product_name: supplier.product_name || '',
        service_type: supplier.service_type || 'Hotel & Resorts',
        phone: supplier.phone || supplier.primary_contact_phone || '',
        email: supplier.email || supplier.contact_email || '',
        primary_contact_name: supplier.primary_contact_name || supplier.contact || '',
        gst: supplier.gst || '',
        payment_terms: getTermsString(supplier.payment_terms),
        commission_pct: supplier.commission_pct || 0,
        address: supplier.address || '',
        address_1: supplier.address_1 || '',
        address_2: supplier.address_2 || '',
        address_3: supplier.address_3 || '',
        address_4: supplier.address_4 || '',
        city: supplier.city || '',
        phone_contacts: supplier.phone_contacts || [],
        email_contacts: supplier.email_contacts || []
      });
    }
  }, [supplier]);

  const addPhoneContact = () => {
    if (!newPhoneContact.phone) return alert('Phone number is required');
    if (form.phone_contacts.length >= 10) return alert('Maximum of 10 phone contacts reached');
    setForm({
      ...form,
      phone_contacts: [...form.phone_contacts, { ...newPhoneContact }]
    });
    setNewPhoneContact({ phone: '', name: '', designation: '' });
  };

  const removePhoneContact = (index) => {
    setForm({
      ...form,
      phone_contacts: form.phone_contacts.filter((_, i) => i !== index)
    });
  };

  const addEmailContact = () => {
    if (!newEmailContact.email) return alert('Email address is required');
    if (form.email_contacts.length >= 10) return alert('Maximum of 10 email contacts reached');
    setForm({
      ...form,
      email_contacts: [...form.email_contacts, { ...newEmailContact }]
    });
    setNewEmailContact({ email: '', name: '', designation: '' });
  };

  const removeEmailContact = (index) => {
    setForm({
      ...form,
      email_contacts: form.email_contacts.filter((_, i) => i !== index)
    });
  };

  const getTermsNumber = (val) => {
    if (val === 'Prepaid') return 0;
    if (val === 'Net 15') return 15;
    if (val === 'Net 30') return 30;
    if (val === 'Net 45') return 45;
    return Number(val) || 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.service_type) {
      alert('Supplier Name and Service Type are required.');
      return;
    }

    // Auto-save partially filled contacts if user forgot to click the "Add" button
    let finalPhoneContacts = [...form.phone_contacts];
    if (newPhoneContact.phone) {
      if (!finalPhoneContacts.some(p => p.phone === newPhoneContact.phone)) {
        finalPhoneContacts.push({ ...newPhoneContact });
      }
    }

    let finalEmailContacts = [...form.email_contacts];
    if (newEmailContact.email) {
      if (!finalEmailContacts.some(e => e.email === newEmailContact.email)) {
        finalEmailContacts.push({ ...newEmailContact });
      }
    }

    const payload = {
      ...form,
      phone_contacts: finalPhoneContacts,
      email_contacts: finalEmailContacts,
      payment_terms: getTermsNumber(form.payment_terms)
    };
    onSave(payload);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content card" style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--divider)', paddingBottom: '10px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}><FiTruck /> {supplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
          <button className="close-btn" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Basic Info Row */}
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Supplier Name*</label>
              <input type="text" className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Product Name</label>
              <input type="text" className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} placeholder="e.g. Airline, Hotel Suite" value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Type/Category*</label>
              <select className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} value={form.service_type} onChange={e => setForm({ ...form, service_type: e.target.value })}>
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Primary Contact & Phone/Email Row */}
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Primary Phone</label>
              <input type="text" className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Primary Email</label>
              <input type="email" className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Contact Person (Primary)</label>
              <input type="text" className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} value={form.primary_contact_name} onChange={e => setForm({ ...form, primary_contact_name: e.target.value })} />
            </div>
          </div>

          {/* GST & Financials */}
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>GST Number</label>
              <input type="text" className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} value={form.gst} onChange={e => setForm({ ...form, gst: e.target.value })} />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Payment Terms</label>
              <select className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })}>
                <option value="Prepaid">Prepaid</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
              </select>
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Commission Rate (%)</label>
              <input type="number" className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} value={form.commission_pct} onChange={e => setForm({ ...form, commission_pct: Number(e.target.value) })} />
            </div>
          </div>

          {/* Addresses */}
          <div className="address-section" style={{ border: '1px solid var(--divider)', padding: '15px', borderRadius: '8px', background: 'rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: 'var(--primary)' }}><FiMapPin /> Addresses</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Main Address</label>
                <input type="text" className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} placeholder="123 Main Street" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Address - 1</label>
                  <input type="text" className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} placeholder="Suite / Suite No" value={form.address_1} onChange={e => setForm({ ...form, address_1: e.target.value })} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Address - 2</label>
                  <input type="text" className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} placeholder="Building / Landmark" value={form.address_2} onChange={e => setForm({ ...form, address_2: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Address - 3</label>
                  <input type="text" className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} placeholder="Area / Locality" value={form.address_3} onChange={e => setForm({ ...form, address_3: e.target.value })} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Address - 4</label>
                  <input type="text" className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} placeholder="State / Pincode" value={form.address_4} onChange={e => setForm({ ...form, address_4: e.target.value })} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>City</label>
                  <input type="text" className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Contacts Management */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Phone Numbers Contacts Section (Max 10) */}
            <div className="contacts-sub-section" style={{ border: '1px solid var(--divider)', padding: '15px', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', color: 'var(--primary)' }}>
                <span><FiPhone /> Phone Contacts ({form.phone_contacts.length}/10)</span>
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 2fr auto', gap: '10px', marginBottom: '15px', alignItems: 'center' }}>
                <input type="text" placeholder="Contact Name" className="form-control" style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} value={newPhoneContact.name} onChange={e => setNewPhoneContact({ ...newPhoneContact, name: e.target.value })} />
                <input type="text" placeholder="Designation" className="form-control" style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} value={newPhoneContact.designation} onChange={e => setNewPhoneContact({ ...newPhoneContact, designation: e.target.value })} />
                <input type="text" placeholder="Phone Number" className="form-control" style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} value={newPhoneContact.phone} onChange={e => setNewPhoneContact({ ...newPhoneContact, phone: e.target.value })} />
                <button type="button" className="btn btn-primary" style={{ padding: '8px 16px' }} onClick={addPhoneContact} disabled={form.phone_contacts.length >= 10}>Add Contact</button>
              </div>

              <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {form.phone_contacts.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.03)', padding: '6px 10px', borderRadius: '5px', fontSize: '0.85rem' }}>
                    <div>
                      <strong>{c.name || 'Unnamed'}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({c.designation || 'N/A'})</span>
                      <span style={{ marginLeft: '15px', color: 'var(--primary)', fontWeight: 500 }}>{c.phone}</span>
                    </div>
                    <button type="button" onClick={() => removePhoneContact(i)} style={{ border: 'none', background: 'none', color: 'var(--status-hot)', cursor: 'pointer' }}><FiTrash2 /></button>
                  </div>
                ))}
                {form.phone_contacts.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No phone contacts added yet.</span>}
              </div>
            </div>

            {/* Email IDs Contacts Section (Max 10) */}
            <div className="contacts-sub-section" style={{ border: '1px solid var(--divider)', padding: '15px', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', color: 'var(--primary)' }}>
                <span><FiMail /> Email Contacts ({form.email_contacts.length}/10)</span>
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 2fr auto', gap: '10px', marginBottom: '15px', alignItems: 'center' }}>
                <input type="text" placeholder="Contact Name" className="form-control" style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} value={newEmailContact.name} onChange={e => setNewEmailContact({ ...newEmailContact, name: e.target.value })} />
                <input type="text" placeholder="Designation" className="form-control" style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} value={newEmailContact.designation} onChange={e => setNewEmailContact({ ...newEmailContact, designation: e.target.value })} />
                <input type="email" placeholder="Email Address" className="form-control" style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }} value={newEmailContact.email} onChange={e => setNewEmailContact({ ...newEmailContact, email: e.target.value })} />
                <button type="button" className="btn btn-primary" style={{ padding: '8px 16px' }} onClick={addEmailContact} disabled={form.email_contacts.length >= 10}>Add Email</button>
              </div>

              <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {form.email_contacts.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.03)', padding: '6px 10px', borderRadius: '5px', fontSize: '0.85rem' }}>
                    <div>
                      <strong>{c.name || 'Unnamed'}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({c.designation || 'N/A'})</span>
                      <span style={{ marginLeft: '15px', color: 'var(--primary)', fontWeight: 500 }}>{c.email}</span>
                    </div>
                    <button type="button" onClick={() => removeEmailContact(i)} style={{ border: 'none', background: 'none', color: 'var(--status-hot)', cursor: 'pointer' }}><FiTrash2 /></button>
                  </div>
                ))}
                {form.email_contacts.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No email contacts added yet.</span>}
              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ borderTop: '1px solid var(--divider)', paddingTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FiCheckCircle /> {supplier ? 'Save Changes' : 'Create Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Suppliers = () => {
  const { state, dispatch } = useLeads();
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [emailingSupplier, setEmailingSupplier] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    const fetchSuppliers = async () => {
      dispatch({ type: 'FETCH_START' });
      try {
        const dbSuppliers = await api.getSuppliers();
        dispatch({ type: 'SET_SUPPLIERS', payload: dbSuppliers });
      } catch (error) {
        console.error('Failed to fetch suppliers:', error);
        dispatch({ type: 'FETCH_ERROR', payload: error.message });
      }
    };
    fetchSuppliers();
  }, [dispatch]);

  const suppliers = useMemo(() => state.suppliers || [], [state.suppliers]);

  const filtered = useMemo(() => {
    return suppliers.filter(s => {
      const nameMatch = s.name.toLowerCase().includes(search.toLowerCase());
      const productMatch = s.product_name && s.product_name.toLowerCase().includes(search.toLowerCase());
      const cityMatch = s.city && s.city.toLowerCase().includes(search.toLowerCase());
      
      const matchSearch = nameMatch || productMatch || cityMatch;
      const matchType = filterType === 'All' || s.service_type === filterType;
      return matchSearch && matchType;
    });
  }, [suppliers, search, filterType]);

  const types = ['All', ...new Set(suppliers.map(s => s.service_type || 'Other'))];

  const typeColor = {
    'Hotel & Resorts': '#10B981',
    'Airline': '#3B82F6',
    'Domestic Tours': '#F59E0B',
    'International Tours': '#8B5CF6',
    'Flight Consolidator': '#EC4899',
    'Visa Agency': '#14B8A6',
    'Transport': '#F97316',
    'Activity Provider': '#EF4444',
    'Other': '#6B7280'
  };

  const handleSaveSupplier = async (formData) => {
    try {
      if (editingSupplier) {
        const supplierId = editingSupplier.id || editingSupplier._id;
        await api.updateSupplier(supplierId, formData);
      } else {
        await api.createSupplier(formData);
      }
      // Re-fetch from DB to ensure state is in sync
      const dbSuppliers = await api.getSuppliers();
      dispatch({ type: 'SET_SUPPLIERS', payload: dbSuppliers });
      setShowModal(false);
      setEditingSupplier(null);
    } catch (err) {
      alert(err.message || 'Failed to save supplier');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete supplier "${name}"?`)) {
      try {
        await api.deleteSupplier(id);
        dispatch({ type: 'DELETE_SUPPLIER', payload: id });
      } catch (err) {
        alert(err.message || 'Failed to delete supplier');
      }
    }
  };

  return (
    <div className="lead-list-page" style={{ padding: '24px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div className="header-left">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>Supplier Management</h1>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>{suppliers.length} registered suppliers found</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { setEditingSupplier(null); setShowModal(true); }}>
            <FiPlus /> Add Supplier
          </button>
        </div>
      </div>

      {showModal && (
        <SupplierModal 
          onClose={() => { setShowModal(false); setEditingSupplier(null); }} 
          onSave={handleSaveSupplier}
          supplier={editingSupplier} 
        />
      )}

      {emailingSupplier && (
        <SendEmailModal 
          onClose={() => setEmailingSupplier(null)} 
          supplier={emailingSupplier} 
        />
      )}

      {/* Filter Bar */}
      <div className="filter-bar card" style={{ display: 'flex', gap: '15px', padding: '16px', borderRadius: '8px', marginBottom: '24px', background: 'var(--card-bg)', border: '1px solid var(--divider)' }}>
        <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, border: '1px solid var(--divider)', borderRadius: '6px', padding: '8px 12px', background: 'rgba(0,0,0,0.01)' }}>
          <FiSearch className="icon" style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by name, product or city..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.9rem' }}
          />
        </div>
        <div className="filter-group">
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--divider)', outline: 'none', fontSize: '0.9rem', minWidth: '150px' }}
          >
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {state.isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {filtered.map(sup => {
            const borderCol = typeColor[sup.service_type] || '#94A3B8';
            const primaryMail = sup.email || sup.contact_email;
            const primaryPhone = sup.phone || sup.primary_contact_phone;

            return (
              <div 
                key={sup.id || sup._id} 
                className="card" 
                style={{ 
                  borderTop: `4px solid ${borderCol}`,
                  background: 'var(--card-bg)',
                  borderRadius: '10px',
                  padding: '20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  border: '1px solid var(--divider)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '15px'
                }}
              >
                {/* Card Title Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '10px', background: `${borderCol}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: borderCol }}>
                      <FiTruck size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{sup.name}</h3>
                      {sup.product_name && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>{sup.product_name}</span>}
                      <span style={{ fontSize: '0.75rem', color: borderCol, fontWeight: 600 }}>{sup.service_type || 'Other'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {((sup.email_contacts && sup.email_contacts.length > 0) || primaryMail) && (
                      <button 
                        onClick={() => setEmailingSupplier(sup)}
                        style={{ border: 'none', background: 'rgba(59, 130, 246, 0.08)', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Send Email"
                      >
                        <FiMail size={14} style={{ color: '#3B82F6' }} />
                      </button>
                    )}
                    <button 
                      onClick={() => { setEditingSupplier(sup); setShowModal(true); }}
                      style={{ border: 'none', background: 'rgba(0,0,0,0.04)', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Edit Supplier"
                    >
                      <FiEdit2 size={14} style={{ color: 'var(--primary)' }} />
                    </button>
                    <button 
                      onClick={() => handleDelete(sup.id || sup._id, sup.name)}
                      style={{ border: 'none', background: 'rgba(239, 68, 68, 0.08)', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Delete Supplier"
                    >
                      <FiTrash2 size={14} style={{ color: '#EF4444' }} />
                    </button>
                  </div>
                </div>

                {/* Info Block (GST, Terms, Comm) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '0.78rem', padding: '10px', background: 'rgba(0,0,0,0.015)', borderRadius: '6px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>GST</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{sup.gst || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Terms</span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {sup.payment_terms === 0 || sup.payment_terms === '0' ? 'Prepaid' : 
                       [15, 30, 45].includes(Number(sup.payment_terms)) ? `Net ${sup.payment_terms}` : 
                       sup.payment_terms || '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Comm.</span>
                    <strong style={{ color: 'var(--primary)' }}>{sup.commission_pct ? `${sup.commission_pct}%` : '0%'}</strong>
                  </div>
                </div>

                {/* Contacts Preview */}
                <div style={{ fontSize: '0.82rem', borderTop: '1px solid var(--divider)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Primary Phone/Email */}
                  {(primaryPhone || primaryMail) && (
                    <div style={{ background: 'rgba(0,0,0,0.01)', padding: '8px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>PRIMARY CONTACT</span>
                      {primaryPhone && <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><FiPhone size={12} style={{ color: 'var(--text-muted)' }} /> {primaryPhone}</div>}
                      {primaryMail && <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><FiMail size={12} style={{ color: 'var(--text-muted)' }} /> {primaryMail}</div>}
                    </div>
                  )}

                  {/* Additional Contacts Scrollbox */}
                  {((sup.phone_contacts && sup.phone_contacts.length > 0) || (sup.email_contacts && sup.email_contacts.length > 0)) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>ADDITIONAL CONTACTS</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '80px', overflowY: 'auto' }}>
                        {sup.phone_contacts?.map((c, i) => (
                          <div key={`p-${i}`} style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.02)', padding: '4px 8px', borderRadius: '4px' }}>
                            <span><strong>{c.name}</strong> ({c.designation || 'N/A'})</span>
                            <span style={{ color: 'var(--primary)', fontWeight: 500 }}><FiPhone size={10} style={{ marginRight: '4px' }} />{c.phone}</span>
                          </div>
                        ))}
                        {sup.email_contacts?.map((c, i) => (
                          <div key={`e-${i}`} style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.02)', padding: '4px 8px', borderRadius: '4px' }}>
                            <span><strong>{c.name}</strong> ({c.designation || 'N/A'})</span>
                            <span style={{ color: 'var(--primary)', fontWeight: 500 }}><FiMail size={10} style={{ marginRight: '4px' }} />{c.email}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!primaryPhone && !primaryMail && (!sup.phone_contacts || sup.phone_contacts.length === 0) && (!sup.email_contacts || sup.email_contacts.length === 0)) && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No contacts registered</div>
                  )}
                </div>

                {/* Addresses display */}
                {(sup.address || sup.city) && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--divider)', paddingTop: '10px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                    <FiMapPin style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      {[sup.address, sup.address_1, sup.address_2, sup.address_3, sup.address_4, sup.city].filter(Boolean).join(', ')}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
              <p className="text-muted">No suppliers found. Add a supplier to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Suppliers;
