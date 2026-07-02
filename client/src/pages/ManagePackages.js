import React, { useState, useEffect, useRef } from 'react';
import {
  FiPlus, FiPackage, FiMapPin, FiClock, FiTrash2, FiEdit2, FiX,
  FiCheck, FiSearch, FiUsers, FiCalendar,
  FiChevronRight, FiChevronLeft, FiAlertCircle,
  FiList, FiHome, FiCoffee, FiNavigation,
} from 'react-icons/fi';
import { api } from '../services/api';

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Honeymoon', 'Family', 'Adventure', 'Beach', 'Cultural',
  'Religious', 'Wildlife', 'Corporate', 'Group Tour', 'Custom',
];

const CATEGORY_COLORS = {
  Honeymoon: '#e91e8c', Family: '#2196F3', Adventure: '#FF5722',
  Beach: '#00BCD4', Cultural: '#9C27B0', Religious: '#FF9800',
  Wildlife: '#4CAF50', Corporate: '#607D8B', 'Group Tour': '#795548', Custom: '#757575',
};

const MEAL_PLANS = [
  { value: 'EP', label: 'EP — Room Only' },
  { value: 'CP', label: 'CP — Bed & Breakfast' },
  { value: 'MAP', label: 'MAP — Breakfast & Dinner' },
  { value: 'AP', label: 'AP — All Meals' },
  { value: 'All Inclusive', label: 'All Inclusive' },
];

const HOTEL_CATEGORIES = ['2 Star', '3 Star', '4 Star', '5 Star', 'Resort', 'Homestay', 'Mixed'];

const STATUS_COLORS = { Draft: '#FF9800', Active: '#4CAF50', Archived: '#9E9E9E' };

const BLANK_FORM = {
  name: '', code: '', category: 'Custom', status: 'Draft',
  description: '', highlights: [], tags: [],
  days: 5, nights: 4, destinations: [],  // nights auto-syncs with days on change
  pricePerPerson: '', pricePerCouple: '', childPrice: '', infantPrice: '',
  currency: 'INR', markup: 0, costPrice: '',
  hotelCategory: '3 Star', mealPlan: 'CP',
  flightIncluded: false, trainIncluded: false, transfersIncluded: true,
  transportDetails: '',
  visaRequired: false, visaType: '', visaAssistance: false,
  minPax: 2, maxPax: '',
  validFrom: '', validTo: '', fixedDepartures: [],
  inclusions: [], exclusions: [],
  cancellationPolicy: '', termsAndConditions: '',
  itinerary: [],
};

const TABS = ['Overview', 'Pricing & Stay', 'Inclusions', 'Itinerary', 'Policy'];

// ─── ChipInput ────────────────────────────────────────────────────────────────

const ChipInput = ({ value = [], onChange, placeholder }) => {
  const [input, setInput] = useState('');
  const ref = useRef(null);

  const add = () => {
    const v = input.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput('');
    ref.current?.focus();
  };

  const remove = (idx) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div
      style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: '6px 8px', minHeight: 42, cursor: 'text', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', background: 'var(--bg-secondary, #f9f9f9)' }}
      onClick={() => ref.current?.focus()}
    >
      {value.map((chip, i) => (
        <span key={i} style={{ background: 'var(--primary)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
          {chip}
          <FiX size={11} style={{ cursor: 'pointer' }} onClick={() => remove(i)} />
        </span>
      ))}
      <input
        ref={ref}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } if (e.key === 'Backspace' && !input && value.length) remove(value.length - 1); }}
        placeholder={value.length === 0 ? placeholder : ''}
        style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem', flex: 1, minWidth: 80 }}
      />
    </div>
  );
};

// ─── ItineraryBuilder ─────────────────────────────────────────────────────────

const ItineraryBuilder = ({ days, itinerary, onChange }) => {
  const rows = Array.from({ length: days }, (_, i) => {
    const existing = itinerary.find(d => d.day === i + 1) || {};
    return { day: i + 1, city: '', title: '', description: '', activities: [], accommodation: '', meals: { breakfast: false, lunch: false, dinner: false }, ...existing };
  });

  const update = (dayNum, field, val) => {
    const updated = rows.map(r => r.day === dayNum ? { ...r, [field]: val } : r);
    onChange(updated);
  };

  const updateMeal = (dayNum, meal, val) => {
    const updated = rows.map(r => r.day === dayNum ? { ...r, meals: { ...r.meals, [meal]: val } } : r);
    onChange(updated);
  };

  if (days < 1) return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Set number of days first (in Overview tab).</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {rows.map(row => (
        <div key={row.day} style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ background: 'var(--primary)', color: '#fff', padding: '8px 14px', fontWeight: 600, fontSize: '0.85rem' }}>
            Day {row.day}
          </div>
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.78rem' }}>City</label>
              <input value={row.city} onChange={e => update(row.day, 'city', e.target.value)} placeholder="e.g. Bangkok" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.78rem' }}>Day Title</label>
              <input value={row.title} onChange={e => update(row.day, 'title', e.target.value)} placeholder="e.g. Arrival & City Tour" />
            </div>
            <div className="form-group" style={{ margin: 0, gridColumn: '1/-1' }}>
              <label style={{ fontSize: '0.78rem' }}>Description</label>
              <textarea value={row.description} onChange={e => update(row.day, 'description', e.target.value)} placeholder="What happens on this day..." style={{ height: 60 }} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.78rem' }}>Accommodation</label>
              <input value={row.accommodation} onChange={e => update(row.day, 'accommodation', e.target.value)} placeholder="Hotel name (optional)" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.78rem' }}>Meals Included</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', height: 38 }}>
                {['breakfast', 'lunch', 'dinner'].map(m => (
                  <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.8rem' }}>
                    <input type="checkbox" checked={row.meals[m]} onChange={e => updateMeal(row.day, m, e.target.checked)} />
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── PackageModal ─────────────────────────────────────────────────────────────

const PackageModal = ({ pkg, onClose, onSaved }) => {
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState(pkg ? {
    ...BLANK_FORM, ...pkg,
    validFrom: pkg.validFrom ? pkg.validFrom.slice(0, 10) : '',
    validTo: pkg.validTo ? pkg.validTo.slice(0, 10) : '',
  } : { ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  const set = (field, val) => {
    setForm(f => {
      const next = { ...f, [field]: val };
      // Auto-sync nights when days changes (only if user hasn't manually overridden nights)
      if (field === 'days') {
        const n = Number(val);
        if (!isNaN(n) && n >= 1) next.nights = n - 1;
      }
      return next;
    });
  };

  const validate = () => {
    const e = {};
    if (!form.name || !form.name.trim()) e.name = 'Package name is required';
    if (!form.days || Number(form.days) < 1) e.days = 'Duration must be at least 1 day';
    if (form.pricePerPerson === '' || form.pricePerPerson === null || form.pricePerPerson === undefined)
      e.pricePerPerson = 'Price per person is required';
    setErrors(e);
    return e;
  };

  const handleSave = async () => {
    setApiError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      // Navigate to the tab that owns the first error
      if (errs.name || errs.days) { setTab(0); return; }
      if (errs.pricePerPerson) { setTab(1); return; }
      return;
    }
    setSaving(true);
    try {
      const days = Number(form.days) || 1;
      const payload = {
        ...form,
        days,
        nights: (form.nights !== '' && form.nights !== null && form.nights !== undefined)
          ? Number(form.nights)
          : days - 1,
        pricePerPerson: Number(form.pricePerPerson),
        pricePerCouple: form.pricePerCouple !== '' ? Number(form.pricePerCouple) : undefined,
        childPrice: form.childPrice !== '' ? Number(form.childPrice) : undefined,
        infantPrice: form.infantPrice !== '' ? Number(form.infantPrice) : undefined,
        costPrice: form.costPrice !== '' ? Number(form.costPrice) : undefined,
        markup: Number(form.markup) || 0,
        minPax: Number(form.minPax) || 1,
        maxPax: form.maxPax !== '' && form.maxPax !== undefined ? Number(form.maxPax) : undefined,
        validFrom: form.validFrom || undefined,
        validTo: form.validTo || undefined,
      };
      const saved = pkg?.id
        ? await api.updatePackage(pkg.id, payload)
        : await api.createPackage(payload);
      onSaved(saved);
      onClose();
    } catch (e) {
      setApiError(e.message || 'Failed to save package. Check all fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  const tabStyle = (i) => ({
    padding: '8px 16px',
    border: 'none',
    borderBottom: tab === i ? '2px solid var(--primary)' : '2px solid transparent',
    background: 'none',
    color: tab === i ? 'var(--primary)' : 'var(--text-secondary)',
    cursor: 'pointer',
    fontWeight: tab === i ? 600 : 400,
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
  });

  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: 40, overflow: 'auto' }}>
      <div className="modal-content card" style={{ maxWidth: 720, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
          <h3 style={{ margin: 0 }}>{pkg ? 'Edit Package' : 'Create New Package'}</h3>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>

        {/* Tab Nav */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', flexShrink: 0, padding: '0 16px' }}>
          {TABS.map((t, i) => (
            <button key={i} style={tabStyle(i)} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>

        {/* API error banner */}
        {apiError && (
          <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', borderBottom: '1px solid #FECACA', flexShrink: 0 }}>
            <FiAlertCircle size={14} style={{ flexShrink: 0 }} />
            {apiError}
            <button onClick={() => setApiError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B' }}><FiX size={14} /></button>
          </div>
        )}

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ── TAB 0: OVERVIEW ── */}
          {tab === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Package Name *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Exotic Thailand — 5 Days" style={errors.name ? { borderColor: '#e74c3c' } : {}} />
                  {errors.name && <small style={{ color: '#e74c3c' }}>{errors.name}</small>}
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Package Code</label>
                  <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="Auto-generated" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.category} onChange={e => set('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)}>
                    <option>Draft</option>
                    <option>Active</option>
                    <option>Archived</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Duration (Days) *</label>
                  <input type="number" min="1" value={form.days} onChange={e => set('days', e.target.value)} style={errors.days ? { borderColor: '#e74c3c' } : {}} />
                  {errors.days && <small style={{ color: '#e74c3c' }}>{errors.days}</small>}
                </div>
                <div className="form-group">
                  <label>Nights</label>
                  <input type="number" min="0" value={form.nights} onChange={e => set('nights', e.target.value)} placeholder="Auto" />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="A short description shown to customers..." style={{ height: 80 }} />
              </div>

              <div className="form-group">
                <label>Destinations <small style={{ color: 'var(--text-muted)' }}>(press Enter to add)</small></label>
                <ChipInput value={form.destinations} onChange={v => set('destinations', v)} placeholder="Add city, e.g. Bangkok..." />
              </div>

              <div className="form-group">
                <label>Highlights <small style={{ color: 'var(--text-muted)' }}>(shown on card, max 5)</small></label>
                <ChipInput value={form.highlights} onChange={v => set('highlights', v.slice(0, 5))} placeholder="Add a highlight, e.g. Phi Phi Island Day Trip..." />
              </div>

              <div className="form-group">
                <label>Tags</label>
                <ChipInput value={form.tags} onChange={v => set('tags', v)} placeholder="weekend-getaway, luxury, budget..." />
              </div>
            </div>
          )}

          {/* ── TAB 1: PRICING & STAY ── */}
          {tab === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiAlertCircle size={13} /> All prices in ₹ INR unless otherwise specified.
              </p>

              <div className="form-row">
                <div className="form-group">
                  <label>Price Per Person (₹) *</label>
                  <input type="number" min="0" value={form.pricePerPerson} onChange={e => set('pricePerPerson', e.target.value)} placeholder="e.g. 45000" style={errors.pricePerPerson ? { borderColor: '#e74c3c' } : {}} />
                  {errors.pricePerPerson && <small style={{ color: '#e74c3c' }}>{errors.pricePerPerson}</small>}
                </div>
                <div className="form-group">
                  <label>Price Per Couple (₹)</label>
                  <input type="number" min="0" value={form.pricePerCouple} onChange={e => set('pricePerCouple', e.target.value)} placeholder="Optional" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Child Price (₹) <small style={{ color: 'var(--text-muted)' }}>2–11 yrs</small></label>
                  <input type="number" min="0" value={form.childPrice} onChange={e => set('childPrice', e.target.value)} placeholder="Optional" />
                </div>
                <div className="form-group">
                  <label>Infant Price (₹) <small style={{ color: 'var(--text-muted)'}}>&lt;2 yrs</small></label>
                  <input type="number" min="0" value={form.infantPrice} onChange={e => set('infantPrice', e.target.value)} placeholder="Optional" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Cost Price (₹) <small style={{ color: 'var(--text-muted)' }}>Internal only</small></label>
                  <input type="number" min="0" value={form.costPrice} onChange={e => set('costPrice', e.target.value)} placeholder="Not shown to customer" />
                </div>
                <div className="form-group">
                  <label>Markup (%)</label>
                  <input type="number" min="0" max="100" value={form.markup} onChange={e => set('markup', e.target.value)} placeholder="e.g. 15" />
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

              <div className="form-row">
                <div className="form-group">
                  <label>Hotel Category</label>
                  <select value={form.hotelCategory} onChange={e => set('hotelCategory', e.target.value)}>
                    <option value="">— Select —</option>
                    {HOTEL_CATEGORIES.map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Meal Plan</label>
                  <select value={form.mealPlan} onChange={e => set('mealPlan', e.target.value)}>
                    <option value="">— Select —</option>
                    {MEAL_PLANS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary, #f8f8f8)', borderRadius: 10, padding: '14px 16px' }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 12, fontSize: '0.85rem' }}>Transport Inclusions</label>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {[
                    { field: 'flightIncluded', label: '✈ Flights' },
                    { field: 'trainIncluded', label: '🚆 Train' },
                    { field: 'transfersIncluded', label: '🚐 Transfers' },
                  ].map(({ field, label }) => (
                    <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem' }}>
                      <input type="checkbox" checked={form[field]} onChange={e => set(field, e.target.checked)} />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
                  <label>Transport Details</label>
                  <input value={form.transportDetails} onChange={e => set('transportDetails', e.target.value)} placeholder="e.g. Ex-Delhi, Economy class, 1 piece 20kg baggage" />
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

              <div className="form-row">
                <div className="form-group">
                  <label>Minimum Pax</label>
                  <input type="number" min="1" value={form.minPax} onChange={e => set('minPax', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Maximum Pax</label>
                  <input type="number" min="1" value={form.maxPax} onChange={e => set('maxPax', e.target.value)} placeholder="Unlimited" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Valid From</label>
                  <input type="date" value={form.validFrom} onChange={e => set('validFrom', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Valid To</label>
                  <input type="date" value={form.validTo} onChange={e => set('validTo', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input type="checkbox" checked={form.visaRequired} onChange={e => set('visaRequired', e.target.checked)} />
                  Visa Required
                </label>
                {form.visaRequired && (
                  <>
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                      <label style={{ fontSize: '0.78rem' }}>Visa Type</label>
                      <input value={form.visaType} onChange={e => set('visaType', e.target.value)} placeholder="e.g. Tourist, On-Arrival" />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem', marginTop: 20 }}>
                      <input type="checkbox" checked={form.visaAssistance} onChange={e => set('visaAssistance', e.target.checked)} />
                      Visa Assistance Provided
                    </label>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 2: INCLUSIONS ── */}
          {tab === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <FiCheck color="#4CAF50" />
                  <label style={{ fontWeight: 600, margin: 0 }}>Inclusions</label>
                  <small style={{ color: 'var(--text-muted)' }}>Press Enter to add each item</small>
                </div>
                <ChipInput value={form.inclusions} onChange={v => set('inclusions', v)} placeholder="e.g. Breakfast daily, Airport transfers, Guide..." />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {['Breakfast', 'Dinner', 'AC Accommodation', 'Airport Transfers', 'Sightseeing', 'Guide', 'Entry Tickets', 'Boat Transfers', 'Travel Insurance'].map(s => (
                    !form.inclusions.includes(s) && (
                      <button key={s} onClick={() => set('inclusions', [...form.inclusions, s])}
                        style={{ background: 'none', border: '1px dashed var(--border-color)', borderRadius: 20, padding: '3px 10px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        + {s}
                      </button>
                    )
                  ))}
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <FiX color="#e74c3c" />
                  <label style={{ fontWeight: 600, margin: 0 }}>Exclusions</label>
                  <small style={{ color: 'var(--text-muted)' }}>What is NOT included</small>
                </div>
                <ChipInput value={form.exclusions} onChange={v => set('exclusions', v)} placeholder="e.g. Personal expenses, Visa fees..." />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {['Airfare', 'Visa Fees', 'Personal Expenses', 'Laundry', 'Tips & Gratuities', 'Travel Insurance', 'Optional Activities', 'Room Service'].map(s => (
                    !form.exclusions.includes(s) && (
                      <button key={s} onClick={() => set('exclusions', [...form.exclusions, s])}
                        style={{ background: 'none', border: '1px dashed var(--border-color)', borderRadius: 20, padding: '3px 10px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        + {s}
                      </button>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: ITINERARY ── */}
          {tab === 3 && (
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 0, marginBottom: 16 }}>
                Day-by-day itinerary for this package. Optional — helps customers see the journey.
              </p>
              <ItineraryBuilder
                days={Number(form.days) || 0}
                itinerary={form.itinerary}
                onChange={v => set('itinerary', v)}
              />
            </div>
          )}

          {/* ── TAB 4: POLICY ── */}
          {tab === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Cancellation Policy</label>
                <textarea
                  value={form.cancellationPolicy}
                  onChange={e => set('cancellationPolicy', e.target.value)}
                  placeholder="e.g. 30+ days before departure: Full refund&#10;15-29 days: 50% refund&#10;0-14 days: No refund"
                  style={{ height: 120 }}
                />
              </div>
              <div className="form-group">
                <label>Terms & Conditions</label>
                <textarea
                  value={form.termsAndConditions}
                  onChange={e => set('termsAndConditions', e.target.value)}
                  placeholder="Package terms, special conditions, booking requirements..."
                  style={{ height: 140 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {tab > 0 && (
              <button className="btn btn-outline" onClick={() => setTab(t => t - 1)}>
                <FiChevronLeft /> Back
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            {tab < TABS.length - 1 && (
              <button className="btn btn-outline" onClick={() => setTab(t => t + 1)}>
                Next <FiChevronRight />
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ minWidth: 130 }}
            >
              {saving ? 'Saving…' : (pkg ? 'Update Package' : 'Save Package')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── PackageCard ──────────────────────────────────────────────────────────────

const PackageCard = ({ pkg, onEdit, onDelete }) => {
  const color = CATEGORY_COLORS[pkg.category] || '#757575';
  const statusColor = STATUS_COLORS[pkg.status] || '#9E9E9E';

  const formatPrice = (n) => n ? `₹${Number(n).toLocaleString('en-IN')}` : null;

  const mealLabel = MEAL_PLANS.find(m => m.value === pkg.mealPlan)?.label?.split(' — ')[0];

  return (
    <div className="card package-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.15s, box-shadow 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {/* Card Header */}
      <div style={{ background: color, height: 110, padding: '14px 16px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 20, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600 }}>
            {pkg.category}
          </span>
          <span style={{ background: statusColor, borderRadius: 20, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600, color: '#fff' }}>
            {pkg.status}
          </span>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>{pkg.name}</div>
          {pkg.code && <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: 2 }}>#{pkg.code}</div>}
        </div>
        <FiPackage size={40} style={{ position: 'absolute', right: 12, bottom: 10, opacity: 0.15 }} />
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Destinations */}
        {pkg.destinations?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {pkg.destinations.slice(0, 4).map((d, i) => (
              <span key={i} style={{ background: 'var(--bg-secondary, #f0f0f0)', borderRadius: 20, padding: '2px 8px', fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <FiMapPin size={10} />{d}
              </span>
            ))}
            {pkg.destinations.length > 4 && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center' }}>+{pkg.destinations.length - 4}</span>}
          </div>
        )}

        {/* Duration & Info row */}
        <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiClock size={12} />{pkg.days}D/{pkg.nights ?? (pkg.days - 1)}N</span>
          {pkg.hotelCategory && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiHome size={12} />{pkg.hotelCategory}</span>}
          {pkg.mealPlan && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiCoffee size={12} />{mealLabel}</span>}
          {pkg.flightIncluded && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiNavigation size={12} />Flights</span>}
        </div>

        {/* Highlights */}
        {pkg.highlights?.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {pkg.highlights.slice(0, 3).map((h, i) => <li key={i}>{h}</li>)}
          </ul>
        )}

        {/* Inclusions count */}
        {pkg.inclusions?.length > 0 && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <FiList size={11} style={{ marginRight: 4 }} />{pkg.inclusions.length} inclusions listed
          </div>
        )}

        {/* Validity */}
        {(pkg.validFrom || pkg.validTo) && (
          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <FiCalendar size={11} />
            {pkg.validFrom ? new Date(pkg.validFrom).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
            {' → '}
            {pkg.validTo ? new Date(pkg.validTo).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Open'}
          </div>
        )}

        {/* Pax */}
        {(pkg.minPax || pkg.maxPax) && (
          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <FiUsers size={11} />
            {pkg.minPax || 1} – {pkg.maxPax ?? '∞'} pax
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, color: color, fontSize: '1.1rem' }}>{formatPrice(pkg.pricePerPerson)}<small style={{ fontWeight: 400, fontSize: '0.68rem', color: 'var(--text-muted)' }}>/person</small></div>
          {pkg.pricePerCouple && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatPrice(pkg.pricePerCouple)} per couple</div>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-icon" title="Edit" onClick={() => onEdit(pkg)}><FiEdit2 /></button>
          <button className="btn-icon text-danger" title="Delete" onClick={() => onDelete(pkg.id)}><FiTrash2 /></button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const ManagePackages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPkg, setEditPkg] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => { loadPackages(); }, []);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const data = await api.getPackages();
      setPackages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaved = (saved) => {
    setPackages(prev => {
      const idx = prev.findIndex(p => p.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [saved, ...prev];
    });
  };

  const handleEdit = (pkg) => { setEditPkg(pkg); setShowModal(true); };

  const handleCloseModal = () => { setShowModal(false); setEditPkg(null); };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this package?')) return;
    try {
      await api.deletePackage(id);
      setPackages(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      alert(e.message || 'Failed to delete');
    }
  };

  const filtered = packages.filter(p => {
    if (filterCategory && p.category !== filterCategory) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.destinations?.join(' ').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: packages.length,
    active: packages.filter(p => p.status === 'Active').length,
    draft: packages.filter(p => p.status === 'Draft').length,
  };

  return (
    <div className="lead-list-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <h1>Package Master</h1>
          <p className="text-secondary">Define and manage holiday packages, itineraries, and group tours.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => { setEditPkg(null); setShowModal(true); }}>
            <FiPlus /> Create Package
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Packages', value: stats.total, color: 'var(--primary)' },
          { label: 'Active', value: stats.active, color: '#4CAF50' },
          { label: 'Draft', value: stats.draft, color: '#FF9800' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 140 }}>
            <span style={{ fontWeight: 700, fontSize: '1.5rem', color: s.color }}>{s.value}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <FiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search packages or destinations..." style={{ paddingLeft: 34, width: '100%' }} />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ minWidth: 140 }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ minWidth: 120 }}>
          <option value="">All Status</option>
          <option>Active</option>
          <option>Draft</option>
          <option>Archived</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading packages...</p>
      ) : filtered.length === 0 && packages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <FiPackage size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontWeight: 600 }}>No packages yet</p>
          <p style={{ fontSize: '0.85rem' }}>Create your first holiday package to get started.</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}><FiPlus /> Create Package</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {filtered.map(pkg => (
            <PackageCard key={pkg.id} pkg={pkg} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
          <div
            onClick={() => setShowModal(true)}
            style={{ border: '2px dashed var(--border-color)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 260, cursor: 'pointer', color: 'var(--text-muted)', transition: 'border-color 0.15s, color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.color = ''; }}
          >
            <FiPlus size={32} />
            <p style={{ marginTop: 8 }}>Add New Package</p>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PackageModal pkg={editPkg} onClose={handleCloseModal} onSaved={handleSaved} />
      )}
    </div>
  );
};

export default ManagePackages;
