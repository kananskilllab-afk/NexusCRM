import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiPlus, FiSearch, FiStar, FiX, FiMapPin, FiNavigation, FiHome, FiCompass,
  FiTruck, FiFileText, FiPackage, FiEdit2, FiTrash2, FiMail, FiPhone,
} from 'react-icons/fi';
import { Button, SectionHeader, StatusPill } from '../components/ui';
import { api } from '../services/api';
import { voyageApi } from '../services/voyageApi';
import './Suppliers.css';

const BASE_TYPE_DEFS = [
  { label: 'All', value: 'All', Icon: FiPackage, color: 'var(--kanan-mute,#6B7280)' },
  { label: 'Flight', value: 'Flight', Icon: FiNavigation, color: 'var(--kanan-sky,#00A0E3)' },
  { label: 'Hotel', value: 'Hotel', Icon: FiHome, color: 'var(--kanan-navy,#393185)' },
  { label: 'Activity', value: 'Activity', Icon: FiCompass, color: 'var(--kanan-lime,#B0CB1F)' },
  { label: 'Transfer', value: 'Transfer', Icon: FiTruck, color: 'var(--kanan-orange,#EF7F1A)' },
  { label: 'Visa', value: 'Visa', Icon: FiFileText, color: 'var(--kanan-purple,#9C2BE3)' },
];

const TYPE_OPTIONS = [
  'Flight', 'Hotel', 'Activity', 'Transfer', 'Visa',
  'Hotel & Resorts', 'Airline', 'Domestic Tours', 'International Tours',
  'Flight Consolidator', 'Visa Agency', 'Transport', 'Activity Provider', 'Other',
];

const GDS_OPTIONS = ['Direct', 'Amadeus', 'Galileo', 'Sabre', 'NDC', 'Other'];
const PAYMENT_TERMS = ['Prepaid', 'Net 15', 'Net 30', 'Net 45'];

const blankSupplier = {
  name: '',
  product_name: '',
  service_type: 'Hotel',
  phone: '',
  email: '',
  gst: '',
  payment_terms: 'Net 30',
  commission_pct: '',
  api_source: 'Direct',
  is_preferred: false,
  status: 'Active',
  address: '',
  address_1: '',
  address_2: '',
  address_3: '',
  address_4: '',
  city: '',
  phone_contacts: [],
  email_contacts: [],
};

const supplierIdOf = (supplier) => supplier?.id || supplier?._id;

const normalizeTerms = (value) => {
  if (value === 0 || value === '0') return 'Prepaid';
  if (value === 15 || value === '15') return 'Net 15';
  if (value === 30 || value === '30') return 'Net 30';
  if (value === 45 || value === '45') return 'Net 45';
  return value || 'Net 30';
};

const termsNumber = (value) => {
  if (value === 'Prepaid') return 0;
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const typeDefOf = (value = '') => {
  const exact = BASE_TYPE_DEFS.find((type) => type.value === value);
  if (exact) return exact;

  const lower = value.toLowerCase();
  if (lower.includes('air') || lower.includes('flight')) return BASE_TYPE_DEFS[1];
  if (lower.includes('hotel') || lower.includes('resort')) return BASE_TYPE_DEFS[2];
  if (lower.includes('tour') || lower.includes('activity')) return BASE_TYPE_DEFS[3];
  if (lower.includes('transfer') || lower.includes('transport')) return BASE_TYPE_DEFS[4];
  if (lower.includes('visa')) return BASE_TYPE_DEFS[5];
  return { label: value || 'Other', value: value || 'Other', Icon: FiPackage, color: 'var(--kanan-mute,#6B7280)' };
};

const primaryEmailOf = (supplier) => supplier.email || supplier.contact_email || '';
const primaryPhoneOf = (supplier) => supplier.phone || supplier.primary_contact_phone || '';

const SendEmailModal = ({ supplier, onClose }) => {
  const primaryEmail = primaryEmailOf(supplier);
  const firstContactEmail = supplier.email_contacts?.[0]?.email || '';
  const [toEmail, setToEmail] = useState(primaryEmail || firstContactEmail);
  const [ccEmails, setCcEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const recipients = useMemo(() => {
    const options = [];
    if (primaryEmail) options.push({ label: `Primary: ${primaryEmail}`, value: primaryEmail });
    supplier.email_contacts?.forEach((contact) => {
      if (contact.email && !options.some((option) => option.value === contact.email)) {
        options.push({
          label: `${contact.name || 'Contact'} (${contact.designation || 'N/A'}): ${contact.email}`,
          value: contact.email,
        });
      }
    });
    return options;
  }, [primaryEmail, supplier.email_contacts]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!toEmail.trim()) return setError('Recipient email is required');
    if (!subject.trim()) return setError('Subject is required');
    if (!body.trim()) return setError('Message is required');

    setSending(true);
    setError('');
    try {
      await voyageApi.sendEmail({
        to_email: toEmail.trim(),
        cc_emails: ccEmails.trim(),
        subject: subject.trim(),
        custom_body: body,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sup-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="sup-modal">
        <div className="sup-modal-hdr">
          <h3>Send Email</h3>
          <button className="sup-modal-close" onClick={onClose} type="button"><FiX size={18} /></button>
        </div>
        <form className="sup-modal-form" onSubmit={handleSubmit}>
          <div className="sup-form-group">
            <label>Recipient</label>
            {recipients.length > 0 ? (
              <select value={toEmail} onChange={(event) => setToEmail(event.target.value)}>
                {recipients.map((recipient) => (
                  <option key={recipient.value} value={recipient.value}>{recipient.label}</option>
                ))}
              </select>
            ) : (
              <input type="email" value={toEmail} onChange={(event) => setToEmail(event.target.value)} />
            )}
          </div>
          <div className="sup-form-group">
            <label>CC emails</label>
            <input value={ccEmails} onChange={(event) => setCcEmails(event.target.value)} placeholder="Comma-separated emails" />
          </div>
          <div className="sup-form-group">
            <label>Subject</label>
            <input value={subject} onChange={(event) => setSubject(event.target.value)} />
          </div>
          <div className="sup-form-group">
            <label>Message</label>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={6} />
          </div>
          {error && <p className="sup-modal-err">{error}</p>}
          <div className="sup-modal-footer">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" loading={sending}>Send</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SupplierModal = ({ supplier, onClose, onSave }) => {
  const [form, setForm] = useState(blankSupplier);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [phoneDraft, setPhoneDraft] = useState({ name: '', designation: '', phone: '' });
  const [emailDraft, setEmailDraft] = useState({ name: '', designation: '', email: '' });

  useEffect(() => {
    if (!supplier) {
      setForm(blankSupplier);
      return;
    }

    setForm({
      ...blankSupplier,
      name: supplier.name || '',
      product_name: supplier.product_name || '',
      service_type: supplier.service_type || 'Hotel',
      phone: primaryPhoneOf(supplier),
      email: primaryEmailOf(supplier),
      gst: supplier.gst || '',
      payment_terms: normalizeTerms(supplier.payment_terms),
      commission_pct: supplier.commission_pct ?? '',
      api_source: supplier.api_source || supplier.gds_source || 'Direct',
      is_preferred: supplier.is_preferred === 1 || supplier.is_preferred === true,
      status: supplier.status || 'Active',
      address: supplier.address || '',
      address_1: supplier.address_1 || '',
      address_2: supplier.address_2 || '',
      address_3: supplier.address_3 || '',
      address_4: supplier.address_4 || '',
      city: supplier.city || supplier.location || '',
      phone_contacts: supplier.phone_contacts || [],
      email_contacts: supplier.email_contacts || [],
    });
  }, [supplier]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const addPhoneContact = () => {
    if (!phoneDraft.phone.trim()) return setError('Phone number is required');
    if (form.phone_contacts.length >= 10) return setError('Maximum 10 phone contacts allowed');
    set('phone_contacts', [...form.phone_contacts, { ...phoneDraft, phone: phoneDraft.phone.trim() }]);
    setPhoneDraft({ name: '', designation: '', phone: '' });
    setError('');
  };

  const addEmailContact = () => {
    if (!emailDraft.email.trim()) return setError('Email address is required');
    if (form.email_contacts.length >= 10) return setError('Maximum 10 email contacts allowed');
    set('email_contacts', [...form.email_contacts, { ...emailDraft, email: emailDraft.email.trim() }]);
    setEmailDraft({ name: '', designation: '', email: '' });
    setError('');
  };

  const removePhoneContact = (index) => {
    set('phone_contacts', form.phone_contacts.filter((_, itemIndex) => itemIndex !== index));
  };

  const removeEmailContact = (index) => {
    set('email_contacts', form.email_contacts.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return setError('Supplier name is required');
    if (!form.service_type) return setError('Supplier type is required');

    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        type: form.service_type,
        payment_terms: termsNumber(form.payment_terms),
        commission_pct: parseFloat(form.commission_pct) || 0,
        is_preferred: form.is_preferred ? 1 : 0,
      });
    } catch (err) {
      setError(err.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sup-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="sup-modal sup-modal--wide">
        <div className="sup-modal-hdr">
          <h3>{supplier ? 'Edit Supplier' : 'Add Supplier'}</h3>
          <button className="sup-modal-close" onClick={onClose} type="button"><FiX size={18} /></button>
        </div>
        <form className="sup-modal-form" onSubmit={handleSubmit}>
          <div className="sup-form-row">
            <div className="sup-form-group">
              <label>Name</label>
              <input value={form.name} onChange={(event) => set('name', event.target.value)} />
            </div>
            <div className="sup-form-group">
              <label>Type</label>
              <select value={form.service_type} onChange={(event) => set('service_type', event.target.value)}>
                {TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="sup-form-group">
              <label>Product</label>
              <input value={form.product_name} onChange={(event) => set('product_name', event.target.value)} />
            </div>
          </div>

          <div className="sup-form-row">
            <div className="sup-form-group">
              <label>City</label>
              <input value={form.city} onChange={(event) => set('city', event.target.value)} />
            </div>
            <div className="sup-form-group">
              <label>Primary phone</label>
              <input value={form.phone} onChange={(event) => set('phone', event.target.value)} />
            </div>
            <div className="sup-form-group">
              <label>Primary email</label>
              <input type="email" value={form.email} onChange={(event) => set('email', event.target.value)} />
            </div>
          </div>

          <div className="sup-form-row">
            <div className="sup-form-group">
              <label>GST</label>
              <input value={form.gst} onChange={(event) => set('gst', event.target.value)} />
            </div>
            <div className="sup-form-group">
              <label>Payment terms</label>
              <select value={form.payment_terms} onChange={(event) => set('payment_terms', event.target.value)}>
                {PAYMENT_TERMS.map((term) => <option key={term} value={term}>{term}</option>)}
              </select>
            </div>
            <div className="sup-form-group">
              <label>Commission %</label>
              <input type="number" min="0" max="100" step="0.5" value={form.commission_pct} onChange={(event) => set('commission_pct', event.target.value)} />
            </div>
          </div>

          <div className="sup-form-row">
            <div className="sup-form-group">
              <label>Source</label>
              <select value={form.api_source} onChange={(event) => set('api_source', event.target.value)}>
                {GDS_OPTIONS.map((source) => <option key={source} value={source}>{source}</option>)}
              </select>
            </div>
            <div className="sup-form-group">
              <label>Status</label>
              <select value={form.status} onChange={(event) => set('status', event.target.value)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <label className="sup-check-label sup-check-label--inline">
              <input type="checkbox" checked={form.is_preferred} onChange={(event) => set('is_preferred', event.target.checked)} />
              <span>Preferred supplier</span>
            </label>
          </div>

          <div className="sup-form-group">
            <label>Address</label>
            <textarea value={form.address} onChange={(event) => set('address', event.target.value)} rows={2} />
          </div>

          <div className="sup-contact-panels">
            <div className="sup-contact-panel">
              <div className="sup-contact-title">Phone contacts ({form.phone_contacts.length}/10)</div>
              <div className="sup-contact-draft">
                <input placeholder="Name" value={phoneDraft.name} onChange={(event) => setPhoneDraft((prev) => ({ ...prev, name: event.target.value }))} />
                <input placeholder="Designation" value={phoneDraft.designation} onChange={(event) => setPhoneDraft((prev) => ({ ...prev, designation: event.target.value }))} />
                <input placeholder="Phone" value={phoneDraft.phone} onChange={(event) => setPhoneDraft((prev) => ({ ...prev, phone: event.target.value }))} />
                <Button variant="secondary" size="sm" type="button" onClick={addPhoneContact}>Add</Button>
              </div>
              <div className="sup-contact-list">
                {form.phone_contacts.map((contact, index) => (
                  <div className="sup-contact-item" key={`${contact.phone}-${index}`}>
                    <span>{contact.name || 'Contact'} ({contact.designation || 'N/A'})</span>
                    <strong>{contact.phone}</strong>
                    <button type="button" onClick={() => removePhoneContact(index)}><FiX size={13} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="sup-contact-panel">
              <div className="sup-contact-title">Email contacts ({form.email_contacts.length}/10)</div>
              <div className="sup-contact-draft">
                <input placeholder="Name" value={emailDraft.name} onChange={(event) => setEmailDraft((prev) => ({ ...prev, name: event.target.value }))} />
                <input placeholder="Designation" value={emailDraft.designation} onChange={(event) => setEmailDraft((prev) => ({ ...prev, designation: event.target.value }))} />
                <input placeholder="Email" value={emailDraft.email} onChange={(event) => setEmailDraft((prev) => ({ ...prev, email: event.target.value }))} />
                <Button variant="secondary" size="sm" type="button" onClick={addEmailContact}>Add</Button>
              </div>
              <div className="sup-contact-list">
                {form.email_contacts.map((contact, index) => (
                  <div className="sup-contact-item" key={`${contact.email}-${index}`}>
                    <span>{contact.name || 'Contact'} ({contact.designation || 'N/A'})</span>
                    <strong>{contact.email}</strong>
                    <button type="button" onClick={() => removeEmailContact(index)}><FiX size={13} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="sup-modal-err">{error}</p>}
          <div className="sup-modal-footer">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" loading={saving}>{supplier ? 'Save Changes' : 'Add Supplier'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SupplierCard = ({ supplier, onEdit, onDelete, onEmail }) => {
  const def = typeDefOf(supplier.service_type);
  const Icon = def.Icon;
  const comm = Number(supplier.commission_pct) || 0;
  const primaryEmail = primaryEmailOf(supplier);
  const primaryPhone = primaryPhoneOf(supplier);
  const canEmail = primaryEmail || supplier.email_contacts?.length > 0;

  return (
    <div className="sup-card" style={{ '--_type-color': def.color }}>
      <div className="sup-card-head">
        <div className="sup-card-icon-box">
          <Icon size={18} />
        </div>
        <div className="sup-card-identity">
          <div className="sup-card-name">{supplier.name}</div>
          {supplier.product_name && <div className="sup-card-product">{supplier.product_name}</div>}
          <span className="sup-card-type-pill">{supplier.service_type || 'Other'}</span>
        </div>
        <div className="sup-card-actions">
          {canEmail && (
            <button className="sup-icon-btn" type="button" title="Email supplier" onClick={() => onEmail(supplier)}>
              <FiMail size={14} />
            </button>
          )}
          <button className="sup-icon-btn" type="button" title="Edit supplier" onClick={() => onEdit(supplier)}>
            <FiEdit2 size={14} />
          </button>
          <button className="sup-icon-btn sup-icon-btn--danger" type="button" title="Delete supplier" onClick={() => onDelete(supplier)}>
            <FiTrash2 size={14} />
          </button>
        </div>
      </div>

      {supplier.is_preferred === 1 && (
        <div className="sup-preferred">
          <FiStar size={11} />
          <span>Preferred</span>
        </div>
      )}

      <div className="sup-card-comm">
        <span className="sup-comm-pct">{comm}%</span>
        <span className="sup-comm-lbl">commission</span>
      </div>

      <div className="sup-card-tags">
        {supplier.city && (
          <span className="sup-tag"><FiMapPin size={10} />{supplier.city}</span>
        )}
        {primaryPhone && (
          <span className="sup-tag"><FiPhone size={10} />{primaryPhone}</span>
        )}
        {primaryEmail && (
          <span className="sup-tag"><FiMail size={10} />{primaryEmail}</span>
        )}
        {supplier.api_source && <span className="sup-tag sup-tag--src">{supplier.api_source}</span>}
        {supplier.status && <StatusPill status={supplier.status.toLowerCase()} size="sm" />}
      </div>

      {(supplier.gst || supplier.payment_terms || supplier.address) && (
        <div className="sup-card-meta">
          {supplier.gst && <span>GST: <strong>{supplier.gst}</strong></span>}
          {supplier.payment_terms !== undefined && <span>Terms: <strong>{normalizeTerms(supplier.payment_terms)}</strong></span>}
          {supplier.address && <span>{supplier.address}</span>}
        </div>
      )}
    </div>
  );
};

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeType, setType] = useState('All');
  const [search, setSearch] = useState('');
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [emailingSupplier, setEmailingSupplier] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSuppliers(await api.getSuppliers());
    } catch (err) {
      setError(err.message || 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const typeTabs = useMemo(() => {
    const dynamicTypes = suppliers
      .map((supplier) => supplier.service_type)
      .filter(Boolean)
      .filter((type) => !BASE_TYPE_DEFS.some((def) => def.value === type));

    const uniqueDynamicTypes = Array.from(new Set(dynamicTypes)).map((type) => {
      const def = typeDefOf(type);
      return { ...def, label: type, value: type };
    });

    return [...BASE_TYPE_DEFS, ...uniqueDynamicTypes];
  }, [suppliers]);

  const filtered = useMemo(() => {
    let list = suppliers;
    if (activeType !== 'All') list = list.filter((supplier) => supplier.service_type === activeType);

    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((supplier) => [
        supplier.name,
        supplier.product_name,
        supplier.city,
        supplier.service_type,
        supplier.api_source,
        primaryEmailOf(supplier),
        primaryPhoneOf(supplier),
      ].some((value) => value?.toLowerCase().includes(query)));
    }

    return list;
  }, [suppliers, activeType, search]);

  const openCreate = () => {
    setEditingSupplier(null);
    setShowModal(true);
  };

  const openEdit = (supplier) => {
    setEditingSupplier(supplier);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
  };

  const handleSave = async (payload) => {
    const saved = editingSupplier
      ? await api.updateSupplier(supplierIdOf(editingSupplier), payload)
      : await api.createSupplier(payload);

    setSuppliers((prev) => {
      if (!editingSupplier) return [saved, ...prev];
      const editedId = supplierIdOf(editingSupplier);
      return prev.map((supplier) => (supplierIdOf(supplier) === editedId ? saved : supplier));
    });
    closeModal();
  };

  const handleDelete = async (supplier) => {
    const id = supplierIdOf(supplier);
    if (!id) return;
    if (!window.confirm(`Delete supplier "${supplier.name}"?`)) return;

    try {
      await api.deleteSupplier(id);
      setSuppliers((prev) => prev.filter((item) => supplierIdOf(item) !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete supplier');
    }
  };

  return (
    <div className="suppliers-page">
      <SectionHeader
        title="Suppliers"
        subtitle="Manage travel suppliers, contacts, commissions, and source partners"
        action={
          <Button variant="primary" size="sm" icon={<FiPlus />} onClick={openCreate}>
            Add Supplier
          </Button>
        }
      />

      <div className="sup-tabs">
        {typeTabs.map(({ label, value, Icon }) => {
          const count = value === 'All'
            ? suppliers.length
            : suppliers.filter((supplier) => supplier.service_type === value).length;

          return (
            <button
              key={value}
              className={`sup-tab${activeType === value ? ' sup-tab--active' : ''}`}
              onClick={() => setType(value)}
              type="button"
            >
              <Icon size={13} />
              {label}
              <span className="sup-tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="sup-search-wrap">
        <FiSearch className="sup-search-icon" size={14} />
        <input
          type="search"
          className="sup-search-input"
          placeholder="Search suppliers"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {error && <p className="sup-error">{error}</p>}

      {loading ? (
        <div className="sup-state">Loading suppliers...</div>
      ) : filtered.length === 0 ? (
        <div className="sup-state">
          {search || activeType !== 'All' ? 'No suppliers match your filter.' : 'No suppliers yet. Add your first one.'}
        </div>
      ) : (
        <div className="sup-grid">
          {filtered.map((supplier) => (
            <SupplierCard
              key={supplierIdOf(supplier)}
              supplier={supplier}
              onEdit={openEdit}
              onDelete={handleDelete}
              onEmail={setEmailingSupplier}
            />
          ))}
        </div>
      )}

      {showModal && (
        <SupplierModal supplier={editingSupplier} onClose={closeModal} onSave={handleSave} />
      )}

      {emailingSupplier && (
        <SendEmailModal supplier={emailingSupplier} onClose={() => setEmailingSupplier(null)} />
      )}
    </div>
  );
};

export default Suppliers;
